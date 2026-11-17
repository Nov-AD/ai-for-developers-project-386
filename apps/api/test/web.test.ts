import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../src/app.ts'

const html = '<!doctype html><html><body>Calendar SPA</body></html>'
let instance: FastifyInstance | undefined
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'calendar-web-'))
  await writeFile(join(root, 'index.html'), html)
  await writeFile(join(root, 'app.js'), 'console.log("calendar")')
  vi.stubEnv('WEB_ROOT', root)
})

afterEach(async () => {
  await instance?.close()
  instance = undefined
  vi.unstubAllEnvs()
  await rm(root, { recursive: true, force: true })
})

async function build() {
  instance = Fastify()
  await instance.register(app)
  await instance.ready()
  return instance
}

describe('production web serving', () => {
  it.each(['/', '/book', '/owner', '/book?source=direct'])('serves the SPA at %s', async (url) => {
    const server = await build()
    const response = await server.inject(url)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^text\/html\b/)
    expect(response.body).toBe(html)
  })

  it('serves assets and keeps API responses as JSON', async () => {
    const server = await build()
    const asset = await server.inject('/app.js')
    expect(asset.statusCode).toBe(200)
    expect(asset.headers['content-type']).toMatch(/javascript/)
    expect(asset.body).toContain('calendar')
    const health = await server.inject('/health')
    expect(health.json()).toEqual({ status: 'ok' })
    const types = await server.inject('/meeting-types')
    expect(types.json()).toEqual([])
  })

  it.each(['/missing-api', '/missing.js', '/assets/missing.css'])(
    'does not hide missing resources behind the SPA: %s',
    async (url) => {
      const server = await build()
      const response = await server.inject(url)
      expect(response.statusCode).toBe(404)
      expect(response.headers['content-type']).toMatch(/^application\/json\b/)
    }
  )

  it('does not serve HTML for a POST to a client route', async () => {
    const server = await build()
    const response = await server.inject({ method: 'POST', url: '/book' })
    expect(response.statusCode).toBe(404)
  })

  it('fails startup if the configured web build is missing', async () => {
    await rm(join(root, 'index.html'))
    await expect(build()).rejects.toThrow('ENOENT')
  })

  it('remains API-only when WEB_ROOT is unset', async () => {
    vi.stubEnv('WEB_ROOT', '')
    const server = await build()
    const response = await server.inject('/book')
    expect(response.statusCode).toBe(404)
  })
})
