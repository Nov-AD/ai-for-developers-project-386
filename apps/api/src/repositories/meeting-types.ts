import { randomUUID } from 'node:crypto'
import type { components } from '../generated/openapi.js'

type MeetingType = components['schemas']['MeetingType']

export interface MeetingTypeRepository {
  list(): MeetingType[]
  find(id: string): MeetingType | undefined
  create(input: components['schemas']['CreateMeetingTypeInput']): MeetingType
}

export class MemoryMeetingTypeRepository implements MeetingTypeRepository {
  private readonly meetingTypes = new Map<string, { value: MeetingType; createdAt: number }>()

  list(): MeetingType[] {
    return Array.from(this.meetingTypes.values())
      .sort((a, b) => a.createdAt - b.createdAt || a.value.id.localeCompare(b.value.id))
      .map(({ value }) => value)
  }

  find(id: string): MeetingType | undefined {
    return this.meetingTypes.get(id)?.value
  }

  create(input: components['schemas']['CreateMeetingTypeInput']): MeetingType {
    const meetingType = { ...input, description: input.description ?? '', id: randomUUID() }
    this.meetingTypes.set(meetingType.id, { value: meetingType, createdAt: Date.now() })
    return meetingType
  }
}
