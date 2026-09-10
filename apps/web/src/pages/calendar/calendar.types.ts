import { type components } from '@project/sdk'

export type ScheduledGoal = components['schemas']['ScheduledGoal']

export type GoalIdea = components['schemas']['GoalIdea']

export type TimeEntry = components['schemas']['TimeEntry']

export type TeamActivityMember = components['schemas']['TeamActivityMember']

export type Horizon = 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'

export type View = 'list' | 'calendar'

export type CalendarMode = 'month' | 'year'

// Where the single-click Schedule button on an idea row lands it. List view defaults to "this
// week" (unchanged); the Calendar view's bottom Ideas section passes a day-aware target instead —
// the selected day if one's open, else today — since a day is already in view there.
export type ScheduleTarget =
  { when: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK' } | { when: 'DATE'; date: Date }
