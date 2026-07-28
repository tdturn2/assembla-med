/** Venue wall-clock helpers — store UTC, book/display in congress IANA timezone. */

export const DEFAULT_CONGRESS_TIMEZONE = 'UTC'

export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (Eastern)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific)' },
  { value: 'America/Toronto', label: 'America/Toronto' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
]

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return true
  } catch {
    return false
  }
}

export function resolveTimeZone(timeZone?: string | null): string {
  const value = (timeZone || DEFAULT_CONGRESS_TIMEZONE).trim()
  if (!value || !isValidTimeZone(value)) {
    return DEFAULT_CONGRESS_TIMEZONE
  }
  return value
}

type ZoneParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Calendar + clock parts of an instant in a timezone. */
export function getZonedDateParts(
  utcIso: string | Date,
  timeZone: string,
): ZoneParts {
  const date = typeof utcIso === 'string' ? new Date(utcIso) : utcIso
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

function getPartsInZone(date: Date, timeZone: string): ZoneParts {
  return getZonedDateParts(date, timeZone)
}

/**
 * Interpret `YYYY-MM-DDTHH:mm[:ss]` as wall time in `timeZone` and return UTC ISO.
 * Does not use the browser/OS local timezone.
 */
export function wallTimeToUtcIso(wallLocal: string, timeZone: string): string {
  const tz = resolveTimeZone(timeZone)
  const match = wallLocal
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) {
    throw new Error(`Invalid wall time: ${wallLocal}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] || 0)

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  for (let i = 0; i < 3; i++) {
    const parts = getPartsInZone(new Date(utcMs), tz)
    const asIfUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const wanted = Date.UTC(year, month - 1, day, hour, minute, second)
    const delta = wanted - asIfUtc
    if (delta === 0) break
    utcMs += delta
  }

  return new Date(utcMs).toISOString()
}

/** UTC instant → `YYYY-MM-DDTHH:mm` for datetime-local inputs in congress TZ. */
export function utcToWallInput(
  utcIso: string | Date,
  timeZone: string,
): string {
  const date = typeof utcIso === 'string' ? new Date(utcIso) : utcIso
  const parts = getPartsInZone(date, resolveTimeZone(timeZone))
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/** Human-readable wall time in congress TZ. */
export function formatInTimeZone(
  utcIso: string | Date,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof utcIso === 'string' ? new Date(utcIso) : utcIso
  return new Intl.DateTimeFormat(undefined, {
    timeZone: resolveTimeZone(timeZone),
    ...options,
  }).format(date)
}

export function formatRangeInTimeZone(
  startIso: string,
  endIso: string,
  timeZone: string,
): string {
  const tz = resolveTimeZone(timeZone)
  const start = formatInTimeZone(startIso, tz)
  const end = formatInTimeZone(endIso, tz)
  return `${start} – ${end}`
}
