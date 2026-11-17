/** Fixed owner scheduling policy; the owner is a single preconfigured person. */
export const OWNER_TIME_ZONE = 'Europe/Moscow' as const
export const WORKDAY_START_MINUTES = 9 * 60
export const WORKDAY_END_MINUTES = 18 * 60
export const SLOT_STEP_MINUTES = 30
export const BOOKING_WINDOW_DAYS = 14

export type BookingWindowStart = 'today' | 'tomorrow'

/**
 * Read `BOOKING_WINDOW_START` once per application start. An unknown value must fail
 * startup clearly instead of silently falling back to a default.
 */
export function readBookingWindowStart(env: NodeJS.ProcessEnv = process.env): BookingWindowStart {
  const raw = env.BOOKING_WINDOW_START?.trim()
  if (!raw) return 'tomorrow'
  if (raw === 'today' || raw === 'tomorrow') return raw
  throw new Error(
    `BOOKING_WINDOW_START must be "today" or "tomorrow" (received "${raw}"). ` +
      'Fix the environment variable and restart the application.'
  )
}
