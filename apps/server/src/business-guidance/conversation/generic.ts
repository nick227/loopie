import type { ConversationInsight } from './types'

// Vertical-agnostic fallback — always eligible, so every venture (including the many taxonomy
// leaves with no dedicated playbook yet) has something real to read. Deliberately has no
// EQUIPMENT entry: that category only exists for businesses with a genuine equipment-maintenance
// story (see conversation/localTrades.ts) — leaking a generic one in here would blur the exact
// contrast the category is for.
export const GENERIC_INSIGHTS: ConversationInsight[] = [
  {
    id: 'generic-one-line-offer',
    category: 'FOUNDATION',
    headline: 'Write your offer down as one plain sentence.',
    detail: 'Use that exact sentence in your pitch, your ads, and your homepage.',
    chipLabel: 'One-line offer',
  },
  {
    id: 'generic-homepage-salesperson',
    category: 'MARKETING',
    headline: 'Most new customers check your homepage before they contact you.',
    detail: "If it looks outdated or incomplete, they won't bother reaching out.",
    chipLabel: 'Homepage first impression',
  },
  {
    id: 'generic-fast-reply',
    category: 'SALES',
    headline: 'Reply to a new lead within an hour if you can.',
    detail: 'Leads who wait past a few hours are usually already talking to a competitor.',
    chipLabel: 'Reply speed',
  },
  {
    id: 'generic-write-it-down',
    category: 'OPERATIONS',
    headline: 'Write down how you do your most repeated task.',
    detail: "You'll need it the first time someone else has to do it instead of you.",
    chipLabel: 'Document your process',
  },
  {
    id: 'generic-hire-for-what-drains-you',
    category: 'TEAM',
    headline: 'Track your own hours for one week before you decide what to hire for.',
    detail: 'Most owners guess wrong about where their time actually goes.',
    chipLabel: 'Track your time first',
  },
  {
    id: 'generic-thank-you-note',
    category: 'RETENTION',
    headline: 'Send a short thank-you after every sale.',
    detail: 'It takes two minutes and is one of the cheapest ways to get a referral.',
    chipLabel: 'Say thank you',
    relatedInsightIds: ['generic-ask-at-the-moment'],
  },
  {
    id: 'generic-ask-at-the-moment',
    category: 'SCALE',
    headline: 'Ask for a referral right after you finish the job, not weeks later.',
    detail: 'Response rates drop fast once the job is out of mind.',
    chipLabel: 'Ask right after delivery',
    relatedInsightIds: ['generic-thank-you-note'],
  },
]
