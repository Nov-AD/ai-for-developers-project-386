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

const createInput = z.strictObject({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).default(''),
  durationMinutes: z.int().min(1).max(540)
}) satisfies z.ZodType<components['schemas']['CreateMeetingTypeInput']>

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

  fastify.post(
    '/meeting-types',
    {
      schema: {
        querystring: z.strictObject({}),
        body: createInput,
        response: { 201: meetingType, 400: validationError }
      },
      errorHandler: (error, _request, reply) => {
        if (
          error.validation ||
          error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
          error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
          error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE'
        ) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Проверьте название, описание и длительность типа встречи.'
          })
        }
        throw error
      }
    },
    async (request, reply) => reply.code(201).send(fastify.meetingTypes.create(request.body))
  )
}

export default meetingTypes
