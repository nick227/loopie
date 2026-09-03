// Local day/week boundary math for the Calendar board — same shift-then-truncate-then-unshift
// pattern as services/homeOverview.ts's (unexported) localDay/localWeek, duplicated rather than
// imported because that file's helpers are private to the dashboard's own aggregation and this
// needs the same math from both CalendarService (the board read) and the reminder poller (has no
// per-request offset, see its own comment).
export function localDayWindow(now: Date, offsetMinutes: number) {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  const start = new Date(Date.UTC(year, month, day) - offsetMinutes * 60_000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

// Aligned to a Monday week start, matching services/homeOverview.ts's localWeek.
export function localWeekWindow(now: Date, offsetMinutes: number) {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000)
  const day = shifted.getUTCDay() // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const date = shifted.getUTCDate() - mondayOffset
  const start = new Date(Date.UTC(year, month, date) - offsetMinutes * 60_000)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return { start, end }
}

// Resolves a quick-schedule choice to a concrete calendar day at local midnight — the anchor
// ScheduledGoal.scheduledFor stores. "Today"/"this week"/"next week" only ever affect this one
// date; no abstract horizon label is persisted (see ScheduledGoal's own schema comment on why).
export function resolveHorizonDate(
  horizon: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK',
  now: Date,
  offsetMinutes: number,
): Date {
  if (horizon === 'TODAY') return localDayWindow(now, offsetMinutes).start
  const week = localWeekWindow(now, offsetMinutes)
  // "This week" defaults to Friday of the current week (a reasonable "sometime this week"
  // anchor); "next week" to Friday of next week. Both still bucket correctly even if picked with
  // a specific earlier date instead — see ScheduledGoal's `scheduledFor` comment.
  const fridayOffsetMs = 4 * 24 * 60 * 60 * 1000
  if (horizon === 'THIS_WEEK') return new Date(week.start.getTime() + fridayOffsetMs)
  return new Date(week.start.getTime() + 7 * 24 * 60 * 60 * 1000 + fridayOffsetMs)
}
