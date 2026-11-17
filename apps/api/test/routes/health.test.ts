import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import app from '../../src/app.ts'

const instances: FastifyInstance[] = []

async function build(): Promise<FastifyInstance> {
  const instance = Fastify()
  await instance.register(app)
  instances.push(instance)
  return instance
}

afterEach(async () => {
  await Promise.all(instances.splice(0).map(async (instance) => instance.close()))
})

describe('GET /health', () => {
  it('reports that the service is running', async () => {
    const instance = await build()

    const response = await instance.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
