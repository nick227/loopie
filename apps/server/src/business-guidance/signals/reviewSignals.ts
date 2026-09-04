// Reactive signal copy (docs/.../01-requirements.md "Reactive Assistant" + .../02-feature-analysis
// .md section 11). Content only — one short heading, an optional one-sentence detail, one concrete
// action label, matching the docs' content rule. AssistantSignalService owns the actual
// relevance/actionability/dedup queries; this file never touches Prisma.
export type SignalKey = 'PAGE_TRAFFIC_NO_LEADS' | 'INTERESTED_LEADS_NEED_FOLLOWUP' | 'SALE_RECORDED'

export const SIGNAL_COPY: Record<
  SignalKey,
  { headline: string; detail?: string; actionLabel: string }
> = {
  PAGE_TRAFFIC_NO_LEADS: {
    headline: 'Your page is getting visits.',
    detail: 'No leads yet.',
    actionLabel: 'Review page',
  },
  INTERESTED_LEADS_NEED_FOLLOWUP: {
    headline: '{n} interested leads need follow-up.',
    actionLabel: 'Add follow-ups',
  },
  SALE_RECORDED: {
    headline: 'You made a sale.',
    detail: "Let's see what worked.",
    actionLabel: 'Review results',
  },
}

// A meaningful-traffic threshold for PAGE_TRAFFIC_NO_LEADS — low enough that a real business hits
// it within days, high enough it isn't noise from the owner's own test visits.
export const PAGE_TRAFFIC_MEANINGFUL_VIEWS = 20
