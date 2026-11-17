import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.ts'
import { assertContractResponse, contractOperations } from '../helpers/contract.ts'

const instances: FastifyInstance[] = []
const operation = contractOperations.find(
  ({ operation }) => operation.operationId === 'listMeetingTypes'
)!.operation
const createOperation = contractOperations.find(
  ({ operation }) => operation.operationId === 'createMeetingType'
)!.operation

async function build(): Promise<FastifyInstance> {
  const instance = Fastify()
  instances.push(instance)
  await instance.register(app)
  return instance
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
  vi.useRealTimers()
})

describe('GET /meeting-types', () => {
  it('returns an empty JSON array matching the contract on a fresh application', async () => {
    const instance = await build()

    const response = await instance.inject({ method: 'GET', url: '/meeting-types' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    expect(response.json()).toEqual([])
    assertContractResponse(operation, response.statusCode, response.json())
  })

  it('rejects unknown query parameters with the contract validation error', async () => {
    const instance = await build()

    const response = await instance.inject({
      method: 'GET',
      url: '/meeting-types?unexpected=value'
    })

    expect(response.statusCode).toBe(400)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    assertContractResponse(operation, response.statusCode, response.json())
  })

  it('starts independent applications with empty lists', async () => {
    const [first, second] = await Promise.all([build(), build()])
    const responses = await Promise.all(
      [first, second].map((instance) => instance.inject({ method: 'GET', url: '/meeting-types' }))
    )

    for (const response of responses) {
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([])
      assertContractResponse(operation, response.statusCode, response.json())
    }
  })
})

describe('POST /meeting-types', () => {
  it('creates a UUID-backed type, trims its name and makes it immediately visible', async () => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: '/meeting-types',
      payload: { name: '  Introduction  ', durationMinutes: 45 }
    })

    expect(response.statusCode).toBe(201)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    expect(response.json()).toEqual({
      id: expect.any(String),
      name: 'Introduction',
      description: '',
      durationMinutes: 45
    })
    assertContractResponse(createOperation, response.statusCode, response.json())

    const list = await instance.inject({ method: 'GET', url: '/meeting-types' })
    expect(list.json()).toEqual([response.json()])
    assertContractResponse(operation, list.statusCode, list.json())
  })

  it.each([
    ['malformed JSON', 'application/json', '{"name":'],
    ['unsupported content type', 'application/xml', '<type />'],
    ['non-JSON text', 'text/plain', '{"name":"Introduction","durationMinutes":45}'],
    ['empty JSON body', 'application/json', '']
  ])('returns contract 400 for %s without saving data', async (_label, contentType, payload) => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: '/meeting-types',
      headers: { 'content-type': contentType },
      payload
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    assertContractResponse(createOperation, response.statusCode, response.json())
    expect((await instance.inject('/meeting-types')).json()).toEqual([])
  })

  it('lists by creation time with UUID as the stable tie-breaker', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'))
    const instance = await build()
    const first = await instance.inject({
      method: 'POST',
      url: '/meeting-types',
      payload: { name: 'First', durationMinutes: 30 }
    })
    vi.setSystemTime(new Date('2026-11-17T10:00:01Z'))
    const simultaneous = []
    for (let index = 0; index < 12; index += 1) {
      const response = await instance.inject({
        method: 'POST',
        url: '/meeting-types',
        payload: { name: `Type ${index}`, durationMinutes: 1 }
      })
      expect(response.statusCode).toBe(201)
      simultaneous.push(response.json())
    }

    const list = await instance.inject('/meeting-types')
    expect(list.json()).toEqual([
      first.json(),
      ...simultaneous.sort((a, b) => a.id.localeCompare(b.id))
    ])
    assertContractResponse(operation, list.statusCode, list.json())
  })

  it.each([
    { name: 'x', description: '', durationMinutes: 1 },
    { name: `  ${'n'.repeat(100)}  `, description: 'd'.repeat(2000), durationMinutes: 540 },
    { name: '  Not on the start grid \n', description: '  Keep this text \n', durationMinutes: 17 },
    { name: '😀'.repeat(100), description: '😀'.repeat(2000), durationMinutes: 45 }
  ])(
    'accepts inclusive boundaries and preserves description: $durationMinutes minutes',
    async (input) => {
      const instance = await build()
      const response = await instance.inject({
        method: 'POST',
        url: '/meeting-types',
        payload: input
      })

      expect(response.statusCode).toBe(201)
      expect(response.json()).toMatchObject({ ...input, name: input.name.trim() })
      assertContractResponse(createOperation, response.statusCode, response.json())
    }
  )

  it.each([
    ['empty name', { name: '', durationMinutes: 30 }],
    ['whitespace name', { name: ' \t\n ', durationMinutes: 30 }],
    ['long trimmed name', { name: ` ${'n'.repeat(101)} `, durationMinutes: 30 }],
    ['long description', { name: 'Test', description: 'd'.repeat(2001), durationMinutes: 30 }],
    ['missing name', { durationMinutes: 30 }],
    ['missing duration', { name: 'Test' }],
    ['numeric name', { name: 1, durationMinutes: 30 }],
    ['null description', { name: 'Test', description: null, durationMinutes: 30 }],
    ['zero duration', { name: 'Test', durationMinutes: 0 }],
    ['negative duration', { name: 'Test', durationMinutes: -1 }],
    ['fractional duration', { name: 'Test', durationMinutes: 1.5 }],
    ['too long duration', { name: 'Test', durationMinutes: 541 }],
    ['string duration', { name: 'Test', durationMinutes: '30' }],
    ['null duration', { name: 'Test', durationMinutes: null }],
    ['unknown field', { name: 'Test', durationMinutes: 30, extra: true }],
    [
      'client UUID',
      { name: 'Test', durationMinutes: 30, id: '11111111-1111-4111-8111-111111111111' }
    ],
    ['array body', []],
    ['null body', null]
  ])('rejects %s and leaves the repository empty', async (_label, payload) => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: '/meeting-types',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(payload)
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    assertContractResponse(createOperation, response.statusCode, response.json())
    expect((await instance.inject('/meeting-types')).json()).toEqual([])
  })

  it('rejects unknown creation query parameters without creating a type', async () => {
    const instance = await build()
    const response = await instance.inject({
      method: 'POST',
      url: '/meeting-types?extra=true',
      payload: { name: 'Test', durationMinutes: 30 }
    })

    expect(response.statusCode).toBe(400)
    assertContractResponse(createOperation, response.statusCode, response.json())
    expect((await instance.inject('/meeting-types')).json()).toEqual([])
  })

  it('does not leak created types across application instances or a restart', async () => {
    const first = await build()
    const second = await build()
    const created = await first.inject({
      method: 'POST',
      url: '/meeting-types',
      payload: { name: 'Only first', durationMinutes: 45 }
    })
    expect(created.statusCode).toBe(201)
    expect((await first.inject('/meeting-types')).json()).toEqual([created.json()])
    expect((await second.inject('/meeting-types')).json()).toEqual([])

    await first.close()
    const restarted = await build()
    expect((await restarted.inject('/meeting-types')).json()).toEqual([])
    expect((await second.inject('/meeting-types')).json()).toEqual([])
  })
})
