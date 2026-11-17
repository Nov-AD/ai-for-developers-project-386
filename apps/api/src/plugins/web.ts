import { access } from 'node:fs/promises'
import { join } from 'node:path'
import staticFiles from '@fastify/static'
import fp from 'fastify-plugin'

/**
 * The Docker image serves the SPA and API from one origin. Without WEB_ROOT
 * the application remains API-only (development and contract tests).
 */
export default fp(async (fastify) => {
  const root = process.env.WEB_ROOT
  if (!root) return

  await access(join(root, 'index.html'))
  await fastify.register(staticFiles, { root })

  fastify.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split('?')[0]
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (pathname === '/book' || pathname === '/owner')
    ) {
      return reply.sendFile('index.html', { maxAge: 0 })
    }
    // Missing API routes and assets must not turn into successful HTML responses.
    return reply.code(404).send({ message: 'Not found', error: 'Not Found', statusCode: 404 })
  })
})
