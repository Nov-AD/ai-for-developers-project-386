import fp from 'fastify-plugin'
import cors from '@fastify/cors'

/**
 * Allows the Vite dev server (and, if configured, other origins) to call the API.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : true
  })
})
