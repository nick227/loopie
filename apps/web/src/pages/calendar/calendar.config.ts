import type { CalendarMode, Horizon, View } from './calendar.types'

interface CalendarConfig {
  defaults: { view: View; mode: CalendarMode; assigneeFilter: string }
  scheduling: {
    estimatePresetsMinutes: readonly number[]
    fallbackEstimateMinutes: number
    listIdeaHorizon: Horizon
    calendarIdeaFallbackHorizon: Horizon
    quickAddHorizon: Horizon
    whenChoices: readonly { value: Horizon; label: string }[]
  }
  display: { monthTaskLimit: number; monthMobileDotLimit: number; yearDotLimitPerStatus: number }
  tracking: { correctionThresholdMinutes: number; refreshIntervalMs: number }
}

export const calendarConfig = {
  defaults: { view: 'list', mode: 'month', assigneeFilter: 'everyone' },
  scheduling: {
    estimatePresetsMinutes: [30, 60, 120],
    fallbackEstimateMinutes: 30,
    listIdeaHorizon: 'THIS_WEEK',
    calendarIdeaFallbackHorizon: 'TODAY',
    quickAddHorizon: 'TODAY',
    whenChoices: [
      { value: 'TODAY', label: 'Today' },
      { value: 'THIS_WEEK', label: 'This week' },
      { value: 'NEXT_WEEK', label: 'Next week' },
    ],
  },
  display: { monthTaskLimit: 3, monthMobileDotLimit: 4, yearDotLimitPerStatus: 8 },
  tracking: { correctionThresholdMinutes: 480, refreshIntervalMs: 30_000 },
} as const satisfies CalendarConfig

// The grid and its range calculation both use Monday as the first weekday.
export const WEEKDAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
