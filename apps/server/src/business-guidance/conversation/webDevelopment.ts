import type { ConversationInsight } from './types'

// Web Development-specific content — exact ventureType match, so this only ever surfaces for that
// leaf, not the broader taxonomy branch. Deliberately no EQUIPMENT category: nothing physical to
// maintain here, the contrast with local trades.
export const WEB_DEVELOPMENT_INSIGHTS: ConversationInsight[] = [
  {
    id: 'webdev-price-by-outcome',
    category: 'FOUNDATION',
    headline: 'Quote a flat price once you know how long the work actually takes.',
    detail: 'Hourly billing caps your income right when you get faster.',
    chipLabel: 'Outcome-based pricing',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-case-studies-convert',
    category: 'MARKETING',
    headline: 'Publish 2-3 case studies with real before-and-after results.',
    detail: "A list of technologies you use doesn't tell a client what they'll actually get.",
    chipLabel: 'Case studies',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-fixed-discovery-call',
    category: 'SALES',
    headline: 'Cap discovery calls at 30 minutes.',
    detail: 'Longer calls turn into free consulting without moving the deal forward.',
    chipLabel: 'Fixed-length discovery calls',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-staging-first',
    category: 'OPERATIONS',
    headline: 'Test every change on staging before it goes live.',
    detail: 'A client who finds your bug first will double-check everything else you deliver.',
    chipLabel: 'Staging-first workflow',
    relatedInsightIds: ['webdev-revision-limit-in-quote'],
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-revision-limit-in-quote',
    category: 'OPERATIONS',
    headline: 'State your revision limit in the quote, not after work starts.',
    detail: "Without a number, small tweaks can turn into a second project you're not paid for.",
    chipLabel: 'Revision limit',
    relatedInsightIds: ['webdev-staging-first'],
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-document-handoff',
    category: 'TEAM',
    headline: 'Write down your setup and deployment steps now.',
    detail: 'Recreating that knowledge later costs more time than documenting it once.',
    chipLabel: 'Document your handoff',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-thirty-day-checkin',
    category: 'RETENTION',
    headline: 'Check in with clients 30 days after launch.',
    detail:
      "Most won't ask for ongoing help — they'll just hire someone else when something breaks.",
    chipLabel: '30-day check-in',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
  {
    id: 'webdev-referrals-at-delivery',
    category: 'SCALE',
    headline: 'Ask for a referral when you deliver the final product, not after.',
    detail: "A client's satisfaction is highest right then and drops the longer you wait.",
    chipLabel: 'Ask at delivery',
    ventureTypes: ['WEB_DEVELOPMENT'],
  },
]
