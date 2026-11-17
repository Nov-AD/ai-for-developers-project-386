import type { components } from '../generated/openapi.js'

type MeetingType = components['schemas']['MeetingType']

export interface MeetingTypeRepository {
  list(): MeetingType[]
}

export class MemoryMeetingTypeRepository implements MeetingTypeRepository {
  private readonly meetingTypes = new Map<string, MeetingType>()

  list(): MeetingType[] {
    return Array.from(this.meetingTypes.values())
  }
}
