import { dayGroupLabel, toDateInput } from './calendar.dates'
import type { ScheduledGoal } from './calendar.types'

// Clusters an already-chronologically-sorted list into consecutive same-label runs — cheap and
// correct as long as the source query stays sorted (This Week ascending, Recently Completed
// descending), which it does; no re-sort needed here.
function groupConsecutive<T>(
  items: T[],
  labelFor: (item: T) => string,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []
  for (const item of items) {
    const label = labelFor(item)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

export function matchesAssignee(goal: ScheduledGoal, filter: string, currentUserId?: string) {
  if (filter === 'everyone') return true
  if (filter === 'unassigned') return goal.assignedToUserId == null
  return goal.assignedToUserId === (filter === 'me' ? currentUserId : filter)
}

export function filterGoals(goals: ScheduledGoal[], filter: string, currentUserId?: string) {
  return goals.filter((goal) => matchesAssignee(goal, filter, currentUserId))
}

export function goalsByDay(goals: ScheduledGoal[]) {
  const result = new Map<string, ScheduledGoal[]>()
  for (const goal of goals) {
    if (!goal.scheduledFor) continue
    const key = toDateInput(new Date(goal.scheduledFor))
    const bucket = result.get(key) ?? []
    bucket.push(goal)
    result.set(key, bucket)
  }
  for (const bucket of result.values())
    bucket.sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''))
  return result
}

export function goalsByMonth(goals: ScheduledGoal[], year: number) {
  const months = Array.from({ length: 12 }, () => ({ scheduled: 0, done: 0 }))
  for (const goal of goals) {
    if (!goal.scheduledFor) continue
    const date = new Date(goal.scheduledFor)
    if (date.getFullYear() !== year) continue
    const bucket = months[date.getMonth()]!
    if (goal.status === 'DONE') bucket.done++
    else bucket.scheduled++
  }
  return months
}

export function groupGoals(
  goals: ScheduledGoal[],
  field: 'scheduledFor' | 'completedAt',
  direction: 'future' | 'past',
  now: Date,
) {
  return groupConsecutive(goals, (goal) => {
    const value = goal[field]
    return value ? dayGroupLabel(new Date(value), now, direction) : 'Unscheduled'
  })
}

export function trackingPicks(goals: ScheduledGoal[], currentUserId?: string) {
  return goals.filter(
    (goal) =>
      goal.status !== 'DONE' &&
      (goal.assignedToUserId == null || goal.assignedToUserId === currentUserId),
  )
}
