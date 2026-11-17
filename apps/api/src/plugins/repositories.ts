import fp from 'fastify-plugin'
import {
  MemoryMeetingTypeRepository,
  type MeetingTypeRepository
} from '../repositories/meeting-types.ts'
import { MemoryBookingRepository, type BookingRepository } from '../repositories/bookings.ts'
import { readBookingWindowStart, type BookingWindowStart } from '../config.ts'

declare module 'fastify' {
  interface FastifyInstance {
    meetingTypes: MeetingTypeRepository
    bookings: BookingRepository
    bookingWindowStart: BookingWindowStart
  }
}

export default fp(async (fastify) => {
  // Allocate inside the plugin: independent app instances never share storage.
  fastify.decorate('meetingTypes', new MemoryMeetingTypeRepository())
  // One shared store for the owner's whole calendar, regardless of meeting type.
  fastify.decorate('bookings', new MemoryBookingRepository())
  // Invalid configuration fails application startup with a clear error.
  fastify.decorate('bookingWindowStart', readBookingWindowStart())
})
