import { z } from 'zod'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { components } from '../generated/openapi.js'

const meetingType = z.object({
  id: z.uuid(),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^\S(?:[\s\S]*\S)?$/),
  description: z.string().max(2000),
  durationMinutes: z.int().min(1).max(540)
}) satisfies z.ZodType<components['schemas']['MeetingType']>

const validationError = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional()
}) satisfies z.ZodType<components['schemas']['ValidationError']>

const meetingTypes: FastifyPluginAsyncZod = async (fastify): Promise<void> => {
  fastify.get(
    '/meeting-types',
    {
      schema: {
        querystring: z.strictObject({}),
        response: { 200: z.array(meetingType), 400: validationError }
      },
      errorHandler: (error, _request, reply) => {
        if (error.validation) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Параметры запроса не поддерживаются.'
          })
        }
        throw error
      }
    },
    async () => fastify.meetingTypes.list()
  )
}

export default meetingTypes
