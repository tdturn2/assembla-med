import {
  getZonedDateParts,
  resolveTimeZone,
  wallTimeToUtcIso,
} from './timezone.js'

/** 0=Sunday … 6=Saturday (JS Date#getDay / Intl weekday). */
export type RoomWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type RoomDayHours = {
  day: RoomWeekday
  /** "HH:mm" in congress timezone */
  start: string
  /** "HH:mm" in congress timezone */
  end: string
}

export type RoomDateOverride = {
  /** YYYY-MM-DD in congress timezone */
  date: string
  /** When true, room is closed that day */
  closed?: boolean
  start?: string
  end?: string
}

export type RoomOpenHours = {
  weekly: RoomDayHours[]
  overrides?: RoomDateOverride[]
}

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidHm(value: string): boolean {
  return HM_RE.test(value)
}

export function hasConfiguredOpenHours(
  openHours: RoomOpenHours | null | undefined,
): boolean {
  if (!openHours) return false
  if ((openHours.weekly || []).length > 0) return true
  return (openHours.overrides || []).length > 0
}

export function parseOpenHours(value: unknown): RoomOpenHours | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as { weekly?: unknown; overrides?: unknown }
  const weekly: RoomDayHours[] = []
  if (Array.isArray(raw.weekly)) {
    for (const row of raw.weekly) {
      if (!row || typeof row !== 'object') continue
      const day = Number((row as RoomDayHours).day)
      const start = String((row as RoomDayHours).start || '')
      const end = String((row as RoomDayHours).end || '')
      if (
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6 &&
        isValidHm(start) &&
        isValidHm(end) &&
        parseHm(start) < parseHm(end)
      ) {
        weekly.push({ day: day as RoomWeekday, start, end })
      }
    }
  }
  const overrides: RoomDateOverride[] = []
  if (Array.isArray(raw.overrides)) {
    for (const row of raw.overrides) {
      if (!row || typeof row !== 'object') continue
      const date = String((row as RoomDateOverride).date || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const closed = Boolean((row as RoomDateOverride).closed)
      const start = (row as RoomDateOverride).start
        ? String((row as RoomDateOverride).start)
        : undefined
      const end = (row as RoomDateOverride).end
        ? String((row as RoomDateOverride).end)
        : undefined
      if (closed) {
        overrides.push({ date, closed: true })
        continue
      }
      if (start && end && isValidHm(start) && isValidHm(end) && parseHm(start) < parseHm(end)) {
        overrides.push({ date, start, end })
      }
    }
  }
  if (!weekly.length && !overrides.length) return null
  return { weekly, overrides: overrides.length ? overrides : undefined }
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function weekdayInZone(date: Date, timeZone: string): RoomWeekday {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    weekday: 'short',
  }).format(date)
  const map: Record<string, RoomWeekday> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[weekday] ?? 0
}

function windowsForDate(
  openHours: RoomOpenHours,
  dateKey: string,
  weekday: RoomWeekday,
): Array<{ start: string; end: string }> {
  const override = (openHours.overrides || []).find((o) => o.date === dateKey)
  if (override) {
    if (override.closed) return []
    if (override.start && override.end) {
      return [{ start: override.start, end: override.end }]
    }
  }
  return (openHours.weekly || [])
    .filter((w) => w.day === weekday)
    .map((w) => ({ start: w.start, end: w.end }))
}

function coveredByWindows(
  startMin: number,
  endMin: number,
  windows: Array<{ start: string; end: string }>,
): boolean {
  if (startMin >= endMin) return false
  return windows.some((w) => {
    const a = parseHm(w.start)
    const b = parseHm(w.end)
    return a <= startMin && endMin <= b
  })
}

/**
 * True when [start, end) fits inside the room's open windows in `timeZone`.
 * Null/empty openHours = always open (back-compat).
 */
export function isIntervalWithinOpenHours(
  start: Date,
  end: Date,
  openHours: RoomOpenHours | null | undefined,
  timeZone: string,
): boolean {
  if (!hasConfiguredOpenHours(openHours)) return true
  if (!(start < end)) return false

  const tz = resolveTimeZone(timeZone)
  const hours = openHours as RoomOpenHours
  let cursor = new Date(start)
  let guard = 0

  while (cursor < end && guard++ < 60) {
    const parts = getZonedDateParts(cursor, tz)
    const dateKey = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
    const weekday = weekdayInZone(cursor, tz)
    const windows = windowsForDate(hours, dateKey, weekday)
    if (!windows.length) return false

    const nextMidnightUtc = new Date(
      wallTimeToUtcIso(`${addCalendarDays(dateKey, 1)}T00:00`, tz),
    )
    const segmentEnd = end < nextMidnightUtc ? end : nextMidnightUtc
    const startMin = parts.hour * 60 + parts.minute
    let endMin: number
    if (segmentEnd.getTime() === nextMidnightUtc.getTime()) {
      endMin = 24 * 60
    } else {
      const endParts = getZonedDateParts(segmentEnd, tz)
      endMin = endParts.hour * 60 + endParts.minute
    }

    if (!coveredByWindows(startMin, endMin, windows)) return false
    cursor = nextMidnightUtc
  }

  return true
}

function addCalendarDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

/** Mon–Fri 08:00–18:00 starter template for Console. */
export function defaultWeekdayOpenHours(
  start = '08:00',
  end = '18:00',
): RoomOpenHours {
  return {
    weekly: ([1, 2, 3, 4, 5] as RoomWeekday[]).map((day) => ({
      day,
      start,
      end,
    })),
  }
}

export const WEEKDAY_LABELS: { day: RoomWeekday; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
]
