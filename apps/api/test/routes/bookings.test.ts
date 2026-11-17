import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.ts'
import { assertContractResponse, contractOperations } from '../helpers/contract.ts'

const instances: FastifyInstance[] = []
const createOperation = contractOperations.find(
  ({ operation }) => operation.operationId === 'createBooking'
)!.operation
const availabilityOperation = contractOperations.find(
  ({ operation }) => operation.operationId === 'getAvailability'
)!.operation

async function build(): Promise<FastifyInstance> {
  const instance = Fastify()
  instances.push(instance)
  await instance.register(app)
  return instance
}

async function createType(
  instance: FastifyInstance,
  durationMinutes: number,
  name = `Тип ${durationMinutes}`
): Promise<string> {
  const created = await instance.inject({
    method: 'POST',
    url: '/meeting-types',
    payload: { name, durationMinutes }
  })
  expect(created.statusCode).toBe(201)
  return created.json<{ id: string }>().id
}

async function book(
  instance: FastifyInstance,
  meetingTypeId: string,
  start: string,
  guestName = 'Гость'
) {
  return instance.inject({
    method: 'POST',
    url: '/bookings',
    payload: { meetingTypeId, start, guestName }
  })
}

async function slots(instance: FastifyInstance, id: string): Promise<string[]> {
  const response = await instance.inject({
    method: 'GET',
    url: `/availability?meetingTypeId=${id}`
  })
  expect(response.statusCode).toBe(200)
  return response.json<{ slots: Array<{ start: string }> }>().slots.map(({ start }) => start)
}

function freeze() {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Tuesday 12:00 in Europe/Moscow; the window starts tomorrow (2026-11-18).
  vi.setSystemTime(new Date('2026-11-17T09:00:00Z'))
  vi.stubEnv('BOOKING_WINDOW_START', 'tomorrow')
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('POST /bookings', () => {
  it('saves a booking with a server UUID and computed end and blocks the slot', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 45)

    const response = await book(instance, id, '2026-11-18T06:00:00Z', '  Анна  ')

    expect(response.statusCode).toBe(201)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    const body = response.json()
    expect(body).toMatchObject({
      meetingType: { id, durationMinutes: 45 },
      guestName: 'Анна',
      start: '2026-11-18T06:00:00Z',
      end: '2026-11-18T06:45:00Z'
    })
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
    assertContractResponse(createOperation, response.statusCode, body)

    expect(await slots(instance, id)).not.toContain('2026-11-18T06:00:00Z')
  })

  it('returns the declared errors for an unknown type and invalid guest input', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 30)

    const unknown = await book(
      instance,
      '99999999-9999-4999-8999-999999999999',
      '2026-11-18T06:00:00Z'
    )
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json()).toMatchObject({ code: 'MEETING_TYPE_NOT_FOUND' })
    assertContractResponse(createOperation, unknown.statusCode, unknown.json())

    for (const name of ['', '   ', 'x'.repeat(101)]) {
      const invalid = await book(instance, id, '2026-11-18T06:00:00Z', name)
      expect(invalid.statusCode).toBe(400)
      expect(invalid.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
      assertContractResponse(createOperation, invalid.statusCode, invalid.json())
    }

    const unknownField = await instance.inject({
      method: 'POST',
      url: '/bookings',
      payload: { meetingTypeId: id, start: '2026-11-18T06:00:00Z', guestName: 'Анна', end: 'x' }
    })
    expect(unknownField.statusCode).toBe(400)
  })

  it('revalidates the window, schedule and future start on creation', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 30)

    const invalidStarts = [
      '2026-11-17T06:00:00Z', // before the window
      '2026-12-02T06:00:00Z', // first instant after the exclusive end date
      '2026-11-21T06:00:00Z', // Saturday
      '2026-11-18T05:30:00Z', // before 09:00 owner time
      '2026-11-18T06:15:00Z', // off the 30-minute grid
      '2026-11-18T15:00:00Z' // exactly 18:00 owner time
    ]
    for (const start of invalidStarts) {
      const response = await book(instance, id, start)
      expect(response.statusCode, start).toBe(400)
      expect(response.json()).toMatchObject({ code: 'INVALID_SLOT' })
      assertContractResponse(createOperation, response.statusCode, response.json())
    }

    // 17:30 owner time is valid for a 30-minute type.
    const boundary = await book(instance, id, '2026-11-18T14:30:00Z')
    expect(boundary.statusCode).toBe(201)
    expect(boundary.json()).toMatchObject({ end: '2026-11-18T15:00:00Z' })
  })

  it('rejects every overlap shape and accepts adjacent intervals', async () => {
    freeze()
    const instance = await build()
    const hour = await createType(instance, 60, 'Час')
    const half = await createType(instance, 30, 'Полчаса')
    const twoHours = await createType(instance, 120, 'Два часа')

    // 11:00–12:00 owner time.
    expect((await book(instance, hour, '2026-11-18T08:00:00Z')).statusCode).toBe(201)

    const opening = [
      [half, '2026-11-18T08:00:00Z', 'same start'],
      [hour, '2026-11-18T07:30:00Z', 'starts before, ends inside'],
      [hour, '2026-11-18T08:30:00Z', 'starts inside, ends after'],
      [twoHours, '2026-11-18T07:30:00Z', 'contains the existing booking'],
      [half, '2026-11-18T08:30:00Z', 'nested inside the existing booking']
    ] as const
    for (const [meetingTypeId, start, label] of opening) {
      const response = await book(instance, meetingTypeId, start)
      expect(response.statusCode, label).toBe(409)
      expect(response.json()).toMatchObject({ code: 'SLOT_CONFLICT' })
      assertContractResponse(createOperation, response.statusCode, response.json())
    }

    const adjacent = await book(instance, half, '2026-11-18T09:00:00Z')
    expect(adjacent.statusCode).toBe(201)
    expect(adjacent.json()).toMatchObject({
      start: '2026-11-18T09:00:00Z',
      end: '2026-11-18T09:30:00Z'
    })
  })

  it('rejects overlapping bookings across meeting types', async () => {
    freeze()
    const instance = await build()
    const first = await createType(instance, 60, 'Час')
    const second = await createType(instance, 30, 'Полчаса')

    const saved = await book(instance, first, '2026-11-18T06:00:00Z')
    expect(saved.statusCode).toBe(201)

    const conflict = await book(instance, second, '2026-11-18T06:30:00Z')

    expect(conflict.statusCode).toBe(409)
    expect(conflict.json()).toMatchObject({ code: 'SLOT_CONFLICT' })
    assertContractResponse(createOperation, conflict.statusCode, conflict.json())
    expect(await slots(instance, second)).not.toContain('2026-11-18T06:30:00Z')
  })

  it('saves exactly one booking for concurrent overlapping requests', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 30)

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        book(instance, id, '2026-11-18T06:00:00Z', `Гость ${index}`)
      )
    )

    expect(responses.filter(({ statusCode }) => statusCode === 201)).toHaveLength(1)
    expect(responses.filter(({ statusCode }) => statusCode === 409)).toHaveLength(4)
    expect(await slots(instance, id)).not.toContain('2026-11-18T06:00:00Z')
  })

  it('saves every concurrent non-overlapping request', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 30)

    const starts = ['2026-11-18T06:00:00Z', '2026-11-18T07:00:00Z', '2026-11-18T08:00:00Z']
    const responses = await Promise.all(starts.map((start) => book(instance, id, start)))

    expect(responses.map(({ statusCode }) => statusCode)).toEqual([201, 201, 201])
    const available = await slots(instance, id)
    for (const start of starts) expect(available).not.toContain(start)
  })

  it('keeps bookings isolated between application instances', async () => {
    freeze()
    const [first, second] = await Promise.all([build(), build()])
    const firstId = await createType(first, 30)
    const secondId = await createType(second, 30)

    expect((await book(first, firstId, '2026-11-18T06:00:00Z')).statusCode).toBe(201)

    expect(await slots(second, secondId)).toContain('2026-11-18T06:00:00Z')
  })

  it('keeps availability responses contract-valid after bookings appear', async () => {
    freeze()
    const instance = await build()
    const id = await createType(instance, 45)
    await book(instance, id, '2026-11-18T06:00:00Z')

    const response = await instance.inject({
      method: 'GET',
      url: `/availability?meetingTypeId=${id}`
    })

    expect(response.statusCode).toBe(200)
    assertContractResponse(availabilityOperation, response.statusCode, response.json())
  })
})
