import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import app from '../../src/app.ts'
import { assertContractResponse, contractOperations } from '../helpers/contract.ts'

const instances: FastifyInstance[] = []
const operation = contractOperations.find(
  ({ operation }) => operation.operationId === 'listMeetingTypes'
)!.operation

async function build(): Promise<FastifyInstance> {
  const instance = Fastify()
  instances.push(instance)
  await instance.register(app)
  return instance
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
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
