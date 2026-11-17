import { z } from 'zod'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { components } from '../generated/openapi.js'
import { OWNER_TIME_ZONE } from '../config.ts'
import { availableSlots, ownerWindow } from '../schedule.ts'

const slot = z.object({
  start: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/),
  end: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/)
}) satisfies z.ZodType<components['schemas']['Slot']>

const availability = z.object({
  ownerTimeZone: z.literal(OWNER_TIME_ZONE),
  windowStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(slot)
}) satisfies z.ZodType<components['schemas']['Availability']>

const validationError = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional()
}) satisfies z.ZodType<components['schemas']['ValidationError']>

const notFoundError = z.object({
  code: z.literal('MEETING_TYPE_NOT_FOUND'),
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional()
}) satisfies z.ZodType<components['schemas']['MeetingTypeNotFoundError']>

const availabilityRoutes: FastifyPluginAsyncZod = async (fastify): Promise<void> => {
  fastify.get(
    '/availability',
    {
      schema: {
        querystring: z.strictObject({ meetingTypeId: z.uuid() }),
        response: { 200: availability, 400: validationError, 404: notFoundError }
      },
      errorHandler: (error, _request, reply) => {
        if (error.validation) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Укажите корректный идентификатор типа встречи.'
          })
        }
        throw error
      }
    },
    async (request, reply) => {
      const meetingType = fastify.meetingTypes.find(request.query.meetingTypeId)
      if (!meetingType) {
        return reply.code(404).send({
          code: 'MEETING_TYPE_NOT_FOUND',
          message: 'Тип встречи не найден.'
        })
      }

      // Recomputed on every request: the window rolls and past starts stop being bookable.
      const now = new Date()
      const window = ownerWindow(fastify.bookingWindowStart, now)

      return {
        ownerTimeZone: OWNER_TIME_ZONE,
        windowStartDate: window.startDate,
        windowEndDate: window.endDate,
        slots: availableSlots({
          window,
          durationMinutes: meetingType.durationMinutes,
          now,
          bookings: fastify.bookings.list().map(({ start, end }) => ({ start, end }))
        })
      }
    }
  )
}

export default availabilityRoutes
