import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import app from '../src/app.ts'

let instance: FastifyInstance | undefined

afterEach(async () => {
  await instance?.close()
  instance = undefined
})

describe('application', () => {
  it('starts and answers HTTP requests', async () => {
    instance = Fastify()
    await instance.register(app)

    const address = await instance.listen({ port: 0, host: '127.0.0.1' })
    const response = await fetch(`${address}/health`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
