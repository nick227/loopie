export const LEAD_STAGE_OPTIONS = [
  'NEW',
  'UNDECIDED',
  'INTERESTED',
  'CLOSED',
  'NOT_INTERESTED',
] as const

export type LeadStageValue = (typeof LEAD_STAGE_OPTIONS)[number]

export const LEAD_STAGE_LABEL: Record<LeadStageValue, string> = {
  NEW: 'New',
  UNDECIDED: 'Undecided',
  INTERESTED: 'Interested',
  CLOSED: 'Closed',
  NOT_INTERESTED: 'Not interested',
}
