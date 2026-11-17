import type { components } from '../generated/openapi.js'

export type Booking = components['schemas']['Booking']

export interface BookingRepository {
  list(): Booking[]
}

/**
 * Shared owner calendar: bookings of all meeting types live in one store so availability
 * is computed once for every type.
 */
export class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>()

  list(): Booking[] {
    return Array.from(this.bookings.values())
  }
}
