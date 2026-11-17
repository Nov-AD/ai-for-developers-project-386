import type { components } from '../generated/openapi.js'

export type Booking = components['schemas']['Booking']
type MeetingType = components['schemas']['MeetingType']

export type SaveBookingInput = {
  meetingType: MeetingType
  guestName: string
  start: string
  end: string
}

export type SaveBookingResult = { status: 'saved'; booking: Booking } | { status: 'conflict' }

export interface BookingRepository {
  list(): Booking[]
  /**
   * Check every booking of every meeting type and save in one synchronous step: no await
   * between the overlap check and the insert, so concurrent requests cannot both win.
   */
  save(input: SaveBookingInput): SaveBookingResult
}

export class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>()

  list(): Booking[] {
    return Array.from(this.bookings.values())
  }

  save(input: SaveBookingInput): SaveBookingResult {
    const start = Date.parse(input.start)
    const end = Date.parse(input.end)
    const overlaps = this.list().some(
      (booking) => start < Date.parse(booking.end) && end > Date.parse(booking.start)
    )
    if (overlaps) return { status: 'conflict' }

    const booking: Booking = {
      id: crypto.randomUUID(),
      meetingType: input.meetingType,
      guestName: input.guestName,
      start: input.start,
      end: input.end
    }
    this.bookings.set(booking.id, booking)
    return { status: 'saved', booking }
  }
}
