import fp from 'fastify-plugin'
import {
  MemoryMeetingTypeRepository,
  type MeetingTypeRepository
} from '../repositories/meeting-types.ts'

declare module 'fastify' {
  interface FastifyInstance {
    meetingTypes: MeetingTypeRepository
  }
}

export default fp(async (fastify) => {
  // Allocate inside the plugin: independent app instances never share storage.
  fastify.decorate('meetingTypes', new MemoryMeetingTypeRepository())
})
