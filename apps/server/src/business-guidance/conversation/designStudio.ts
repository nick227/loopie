import type { ConversationInsight } from './types'

// Design Studio-specific content — exact ventureType match. Deliberately no EQUIPMENT category:
// the operational layer here is all client/creative process, not physical gear — the contrast
// with local trades.
export const DESIGN_STUDIO_INSIGHTS: ConversationInsight[] = [
  {
    id: 'design-studio-tiered-pricing',
    category: 'FOUNDATION',
    headline: 'Offer 3 fixed-price packages instead of an hourly rate.',
    detail: 'A client choosing between options closes faster than one negotiating your rate.',
    chipLabel: 'Tiered pricing',
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-lead-with-strongest-work',
    category: 'MARKETING',
    headline: 'Lead your portfolio with your 3 strongest pieces, not your newest.',
    detail: 'Most people never scroll past the first few.',
    chipLabel: 'Lead with your best work',
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-revision-limit-in-quote',
    category: 'SALES',
    headline: 'State your revision-round limit in the quote before work starts.',
    detail: "Raising it mid-project after limits are exceeded costs you the client's trust.",
    chipLabel: 'Revision limit',
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-one-approval-step',
    category: 'OPERATIONS',
    headline: 'Require one named approver per feedback round.',
    detail:
      'Feedback from five people in five emails is slower to act on than one signed-off list.',
    chipLabel: 'One approval step',
    relatedInsightIds: ['design-studio-brief-upfront'],
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-brief-upfront',
    category: 'OPERATIONS',
    headline: 'Send a short creative brief before starting any project.',
    detail: 'Most rework traces back to a question the brief never asked.',
    chipLabel: 'Brief upfront',
    relatedInsightIds: ['design-studio-one-approval-step'],
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-shared-brief-template',
    category: 'TEAM',
    headline: 'Use one brief template for every project.',
    detail: 'Without it, quality and process depend on which designer picks up the job.',
    chipLabel: 'Shared brief template',
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-quarterly-checkin',
    category: 'RETENTION',
    headline: 'Check in with past clients every quarter.',
    detail: 'Most repeat design work goes to whoever reaches out first, not the best portfolio.',
    chipLabel: 'Quarterly check-in',
    ventureTypes: ['DESIGN_STUDIO'],
  },
  {
    id: 'design-studio-retainer-value',
    category: 'SCALE',
    headline: 'A retainer client is worth more than several one-off projects at the same rate.',
    detail: "Price it for the predictable income, not just the hours you'll spend.",
    chipLabel: 'Retainer value',
    ventureTypes: ['DESIGN_STUDIO'],
  },
]
