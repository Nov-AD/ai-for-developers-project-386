import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.ts'
import { assertContractResponse, contractOperations } from '../helpers/contract.ts'

const instances: FastifyInstance[] = []
const availabilityOperation = contractOperations.find(
  ({ operation }) => operation.operationId === 'getAvailability'
)!.operation

async function build(): Promise<FastifyInstance> {
  const instance = Fastify()
  instances.push(instance)
  await instance.register(app)
  return instance
}

async function createType(instance: FastifyInstance, durationMinutes: number): Promise<string> {
  const created = await instance.inject({
    method: 'POST',
    url: '/meeting-types',
    payload: { name: `Тип ${durationMinutes}`, durationMinutes }
  })
  expect(created.statusCode).toBe(201)
  return created.json<{ id: string }>().id
}

async function availability(instance: FastifyInstance, id: string) {
  return instance.inject({ method: 'GET', url: `/availability?meetingTypeId=${id}` })
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('GET /availability', () => {
  it('returns a 14-date owner window with 30-minute starts inside Monday–Friday 09:00–18:00', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 2026-11-17T09:00Z is Tuesday 12:00 in Europe/Moscow.
    vi.setSystemTime(new Date('2026-11-17T09:00:00Z'))
    vi.stubEnv('BOOKING_WINDOW_START', 'tomorrow')
    const instance = await build()
    const id = await createType(instance, 45)

    const response = await availability(instance, id)

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    const body = response.json<{
      ownerTimeZone: string
      windowStartDate: string
      windowEndDate: string
      slots: Array<{ start: string; end: string }>
    }>()
    expect(body).toMatchObject({
      ownerTimeZone: 'Europe/Moscow',
      windowStartDate: '2026-11-18',
      windowEndDate: '2026-12-02'
    })
    expect(body.slots[0]).toEqual({ start: '2026-11-18T06:00:00Z', end: '2026-11-18T06:45:00Z' })
    // 10 working dates × 17 starts (09:00 … 17:00 owner time).
    expect(body.slots).toHaveLength(170)
    expect(body.slots.at(-1)).toEqual({
      start: '2026-12-01T14:00:00Z',
      end: '2026-12-01T14:45:00Z'
    })
    assertContractResponse(availabilityOperation, response.statusCode, body)
  })

  it('starts the window today and hides starts that are not strictly in the future', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Tuesday 12:00 in Europe/Moscow; 09:00 owner time is already past.
    vi.setSystemTime(new Date('2026-11-17T09:00:00Z'))
    vi.stubEnv('BOOKING_WINDOW_START', 'today')
    const instance = await build()
    const id = await createType(instance, 45)

    const body = (await availability(instance, id)).json<{
      windowStartDate: string
      windowEndDate: string
      slots: Array<{ start: string }>
    }>()

    expect(body.windowStartDate).toBe('2026-11-17')
    expect(body.windowEndDate).toBe('2026-12-01')
    expect(body.slots[0]?.start).toBe('2026-11-17T09:30:00Z')
  })

  it('excludes a start that is exactly now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-18T06:00:00Z'))
    vi.stubEnv('BOOKING_WINDOW_START', 'today')
    const instance = await build()
    const id = await createType(instance, 30)

    const body = (await availability(instance, id)).json<{ slots: Array<{ start: string }> }>()

    expect(body.slots[0]?.start).toBe('2026-11-18T06:30:00Z')
  })

  it('keeps a 540-minute type inside 09:00–18:00 and excludes weekends', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T09:00:00Z'))
    vi.stubEnv('BOOKING_WINDOW_START', 'tomorrow')
    const instance = await build()
    const id = await createType(instance, 540)

    const body = (await availability(instance, id)).json<{
      slots: Array<{ start: string; end: string }>
    }>()

    expect(body.slots[0]).toEqual({ start: '2026-11-18T06:00:00Z', end: '2026-11-18T15:00:00Z' })
    expect(body.slots).toHaveLength(10)
    expect(body.slots.map(({ start }) => start.slice(0, 10))).not.toContain('2026-11-21')
  })

  it('crosses the month and year boundary without adding 24-hour steps', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Thursday 12:00 in Europe/Moscow.
    vi.setSystemTime(new Date('2026-12-24T09:00:00Z'))
    vi.stubEnv('BOOKING_WINDOW_START', 'tomorrow')
    const instance = await build()
    const id = await createType(instance, 30)

    const body = (await availability(instance, id)).json<{
      windowStartDate: string
      windowEndDate: string
    }>()

    expect(body).toMatchObject({ windowStartDate: '2026-12-25', windowEndDate: '2027-01-08' })
  })

  it('keeps owner dates when the system time zone differs', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 2026-11-17T22:00Z is already 2026-11-18 in Moscow but still 17:00 in New York.
    vi.setSystemTime(new Date('2026-11-17T22:00:00Z'))
    vi.stubEnv('TZ', 'America/New_York')
    vi.stubEnv('BOOKING_WINDOW_START', 'today')
    const instance = await build()
    const id = await createType(instance, 30)

    const body = (await availability(instance, id)).json<{ windowStartDate: string }>()

    expect(body.windowStartDate).toBe('2026-11-18')
  })

  it('rejects a missing or malformed meeting type id', async () => {
    const instance = await build()

    for (const url of ['/availability', '/availability?meetingTypeId=not-a-uuid']) {
      const response = await instance.inject({ method: 'GET', url })

      expect(response.statusCode).toBe(400)
      expect(response.headers['content-type']).toMatch(/^application\/json\b/)
      expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
      assertContractResponse(availabilityOperation, response.statusCode, response.json())
    }
  })

  it('returns the contract not-found error for an unknown type', async () => {
    const instance = await build()

    const response = await availability(instance, '11111111-1111-4111-8111-111111111111')

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'MEETING_TYPE_NOT_FOUND' })
    assertContractResponse(availabilityOperation, response.statusCode, response.json())
  })

  it('defaults to tomorrow and refuses to start with an invalid BOOKING_WINDOW_START', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T09:00:00Z'))

    vi.stubEnv('BOOKING_WINDOW_START', '')
    const defaulted = await build()
    const id = await createType(defaulted, 30)
    expect((await availability(defaulted, id)).json<{ windowStartDate: string }>()).toMatchObject({
      windowStartDate: '2026-11-18'
    })

    vi.stubEnv('BOOKING_WINDOW_START', 'next-week')
    const invalid = Fastify()
    instances.push(invalid)
    await expect(async () => {
      await invalid.register(app)
      await invalid.ready()
    }).rejects.toThrow(/BOOKING_WINDOW_START/)
  })
})
