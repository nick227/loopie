import type { ScheduleTarget } from './calendar.types'

export function formatMinutes(minutes: number | null | undefined): string | null {
  if (!minutes) return null
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Elapsed time on a running entry — unlike formatMinutes (which hides a falsy/zero estimate),
// this always renders, including "0m" right after a timer starts. Approximated to the nearest
// minute per the product spec, not seconds.
export function formatElapsedMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

// Local midnight of `day`, as an ISO instant — same encoding as lib/calendarWindows.ts's
// resolveHorizonDate on the server, so a day picked here buckets correctly everywhere else.
export function startOfDayIso(day: Date): string {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function daysBetween(a: Date, b: Date): number {
  const startA = new Date(a)
  startA.setHours(0, 0, 0, 0)
  const startB = new Date(b)
  startB.setHours(0, 0, 0, 0)
  return Math.round((startA.getTime() - startB.getTime()) / (24 * 60 * 60 * 1000))
}

// The header a day-grouped list (This Week / Upcoming looking forward, Recently Completed looking
// back) shows above the goals that land on it — this is the "grouping" a flat scheduledFor-sorted
// list was missing: Today/Tomorrow/a weekday name close in, a short date further out, so a week's
// worth of tasks reads as days at a glance instead of an undifferentiated pile.
export function dayGroupLabel(date: Date, now: Date, direction: 'future' | 'past'): string {
  const diff = daysBetween(date, now)
  if (diff === 0) return 'Today'
  if (direction === 'future') {
    if (diff === 1) return 'Tomorrow'
    if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (diff === -1) return 'Yesterday'
  if (diff < -1 && diff >= -6) return 'Earlier this week'
  return 'Earlier'
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function toDateTimeInput(date: Date): string {
  return `${toDateInput(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function parseLocalDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && toDateInput(date) === value ? date : null
}

export function localInputToIso(date: string, time = ''): string {
  if (!parseLocalDate(date)) throw new Error('Choose a valid date.')
  const value = new Date(`${date}T${time || '00:00'}:00`)
  if (Number.isNaN(value.getTime()) || (time && toDateTimeInput(value) !== `${date}T${time}`)) {
    throw new Error('Choose a valid local time.')
  }
  return value.toISOString()
}

export function scheduleInputs(iso: string | null | undefined, hasTime: boolean | undefined) {
  if (!iso) return { date: '', time: '' }
  const local = toDateTimeInput(new Date(iso))
  return { date: local.slice(0, 10), time: hasTime ? local.slice(11, 16) : '' }
}

export function monthInterval(anchor: Date) {
  const from = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const to = addDays(startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)), 7)
  const days: Date[] = []
  for (let day = from; day < to; day = addDays(day, 1)) days.push(day)
  return { from, to, days }
}

export function calendarRange(anchor: Date, mode: 'month' | 'year') {
  return mode === 'month'
    ? monthInterval(anchor)
    : {
        from: new Date(anchor.getFullYear(), 0, 1),
        to: new Date(anchor.getFullYear() + 1, 0, 1),
      }
}

export function splitDateTimeInput(value: string): [string, string] {
  const [date = '', time = ''] = value.split('T')
  return [date, time]
}

// Assignment links carry ISO instants; manually selected dates use local YYYY-MM-DD values.
export function parseCalendarRouteDate(value: string | null): Date | null {
  const local = parseLocalDate(value)
  if (local) return local
  if (!value || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const instant = new Date(value)
  return Number.isNaN(instant.getTime()) ? null : instant
}

export function scheduleTargetPayload(target: ScheduleTarget) {
  return target.when === 'DATE'
    ? { when: 'DATE' as const, date: startOfDayIso(target.date), hasTime: false }
    : { when: target.when }
}
