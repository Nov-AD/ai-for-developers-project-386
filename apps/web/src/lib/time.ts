const OWNER_TIME_ZONE = 'Europe/Moscow'
const DEFAULT_LOCALE = 'ru-RU'

/** Owner zone, used for scheduling and window boundaries. */
export function ownerZone(ownerTimeZone: string | undefined): string {
  return ownerTimeZone ?? OWNER_TIME_ZONE
}

/**
 * Guest zone from the browser; when the browser cannot provide a valid IANA zone,
 * fall back to the owner zone so times stay unambiguous.
 */
export function guestTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!zone) return OWNER_TIME_ZONE
  try {
    new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeZone: zone }).format(0)
    return zone
  } catch {
    return OWNER_TIME_ZONE
  }
}

/** Calendar date (YYYY-MM-DD) of an instant in the given zone. */
export function dateKeyInZone(instant: string | Date, timeZone: string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
  return parts
}

export function formatDateKey(dateKey: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${dateKey}T00:00:00Z`))
}

/** Full date, time and explicit zone abbreviation, so a date shift between zones is visible. */
export function formatInstant(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(instant))
}

/** All owner calendar dates in the inclusive/exclusive window. */
export function dateKeysBetween(startDate: string, endDate: string): string[] {
  const keys: string[] = []
  const end = Date.parse(`${endDate}T00:00:00Z`)
  for (let time = Date.parse(`${startDate}T00:00:00Z`); time < end; time += 86_400_000) {
    keys.push(new Date(time).toISOString().slice(0, 10))
  }
  return keys
}
