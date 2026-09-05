import type { ConversationInsight } from './types'

// Local-trade-specific content — reachable by any business tagged LOCAL. The EQUIPMENT pair is
// gated to EQUIPMENT_HEAVY specifically (Roofing, HVAC, Lawn mowing, Landscaping, Pressure
// washing), not every LOCAL business, since plenty of local trades don't run gas equipment at all.
export const LOCAL_TRADES_INSIGHTS: ConversationInsight[] = [
  {
    id: 'local-break-even-job-size',
    category: 'FOUNDATION',
    headline: 'Calculate your break-even job size — gas, time, and wear on your gear included.',
    detail: 'Any job priced under that number is losing you money, not covering it.',
    chipLabel: 'Break-even pricing',
    traits: ['LOCAL'],
  },
  {
    id: 'local-real-job-photos',
    category: 'MARKETING',
    headline: 'Show real photos of your own jobs on your homepage.',
    detail:
      "Homeowners check for real work before they call — a generic photo doesn't answer that.",
    chipLabel: 'Real job photos',
    traits: ['LOCAL'],
  },
  {
    id: 'local-fast-quotes',
    category: 'SALES',
    headline: 'Quote within 24 hours.',
    detail: 'Homeowners usually book one of the first few quotes they get, not the best one.',
    chipLabel: 'Fast quotes',
    traits: ['LOCAL'],
  },
  {
    id: 'local-minimum-price-per-stop',
    category: 'OPERATIONS',
    headline: 'Set a minimum price for every stop.',
    detail: 'Route time makes small jobs expensive.',
    chipLabel: 'Minimum pricing',
    relatedInsightIds: ['local-route-pricing'],
    traits: ['LOCAL'],
  },
  {
    id: 'local-route-pricing',
    category: 'OPERATIONS',
    headline: 'Price by drive time, not just job size.',
    detail: 'A small job 20 minutes away can cost more than it earns.',
    chipLabel: 'Route pricing',
    relatedInsightIds: ['local-minimum-price-per-stop'],
    traits: ['LOCAL'],
  },
  {
    id: 'local-document-before-hiring',
    category: 'TEAM',
    headline: 'Write down your intake and job process before you hire.',
    detail: 'Without it, training takes longer and mistakes get repeated.',
    chipLabel: 'Document before hiring',
    traits: ['LOCAL'],
  },
  {
    id: 'local-track-equipment-hours',
    category: 'EQUIPMENT',
    headline: 'Track hours on your mower or blower.',
    detail: 'A $40 tune-up costs far less than an unplanned $400 breakdown mid-route.',
    chipLabel: 'Track equipment hours',
    relatedInsightIds: ['local-keep-a-backup'],
    traits: ['EQUIPMENT_HEAVY'],
  },
  {
    id: 'local-keep-a-backup',
    category: 'EQUIPMENT',
    headline: 'Keep a spare of whatever breaks most often.',
    detail: 'One backup tool is the difference between a delay and a lost day of jobs.',
    chipLabel: 'Keep a backup',
    relatedInsightIds: ['local-track-equipment-hours'],
    traits: ['EQUIPMENT_HEAVY'],
  },
  {
    id: 'local-check-in-call',
    category: 'RETENTION',
    headline: 'Call customers a few days after the first job.',
    detail: 'It takes five minutes and catches problems before they become a bad review.',
    chipLabel: 'Post-job check-in',
    traits: ['LOCAL'],
  },
  {
    id: 'local-seasonal-reminder',
    category: 'SCALE',
    headline: 'Text or email past customers two weeks before the season starts.',
    detail: "Most won't think to call you first — they'll just search again.",
    chipLabel: 'Seasonal reminders',
    traits: ['LOCAL'],
  },
]
