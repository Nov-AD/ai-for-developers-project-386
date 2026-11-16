import { z } from 'zod'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { components } from '../generated/openapi.js'

type HealthResponse = components['schemas']['HealthResponse']

// The contract is the source of truth: `satisfies` fails the build if the Zod
// schema stops producing the shape generated from OpenAPI.
const healthResponse = z.object({
  status: z.literal('ok')
}) satisfies z.ZodType<HealthResponse>

const health: FastifyPluginAsyncZod = async (fastify): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/health',
    schema: {
      response: {
        200: healthResponse
      }
    },
    handler: async () => ({ status: 'ok' as const })
  })
}

export default health
