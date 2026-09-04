import { db } from '@project/db'
import type { AssistantGoalCycle } from '@prisma/client'
import {
  countLeadsFlaggedForFollowUp,
  countInterestedLeadsNeedingProposal,
} from '../lib/coachRules'
import {
  SIGNAL_COPY,
  PAGE_TRAFFIC_MEANINGFUL_VIEWS,
  type SignalKey,
} from '../business-guidance/signals/reviewSignals'

export type Signal = {
  key: SignalKey
  headline: string
  detail?: string
  actionLabel: string
}

export async function saleRecordedSince(businessId: string, since: Date): Promise<boolean> {
  const sale = await db.sale.findFirst({
    where: { businessId, date: { gte: since }, reversedAt: null },
    select: { id: true },
  })
  return !!sale
}

export async function countInterestedLeadsNeedingFollowup(businessId: string): Promise<number> {
  const [flagged, needsProposal] = await Promise.all([
    countLeadsFlaggedForFollowUp(businessId),
    countInterestedLeadsNeedingProposal(businessId),
  ])
  return flagged + needsProposal
}

// No existing rollup for "views vs submissions since a date" (PageView has no 7d/since aggregate)
// — a small, direct pair of counts.
async function pageTrafficNoLeads(businessId: string, since: Date): Promise<boolean> {
  const publishedPages = await db.landingPage.findMany({
    where: { businessId, deletedAt: null, status: 'PUBLISHED' },
    select: { id: true },
  })
  if (publishedPages.length === 0) return false
  const pageIds = publishedPages.map((p) => p.id)

  const [views, submissions] = await Promise.all([
    db.pageView.count({ where: { landingPageId: { in: pageIds }, occurredAt: { gte: since } } }),
    db.formSubmission.count({
      where: { businessId, landingPageId: { in: pageIds }, createdAt: { gte: since } },
    }),
  ])
  return views >= PAGE_TRAFFIC_MEANINGFUL_VIEWS && submissions === 0
}

// Reactive signals (docs/loopie-assistant-playbook-poc/01-requirements.md "Reactive Assistant") —
// pull-based / compute-on-read, same discipline as DashboardService.buildHomeOverview and
// CalendarService.getBoard: no new event bus, just a real query against real state on every
// getNextAction call. Only fires while an active goal cycle exists (relevance gate: "tied to an
// active goal") and is deduped via the cycle's own lastSignalKey/lastSignalDismissedAt.
export class AssistantSignalService {
  async findSignal(businessId: string, cycle: AssistantGoalCycle): Promise<Signal | null> {
    if (!cycle.actStartedAt) return null

    if (
      (await saleRecordedSince(businessId, cycle.actStartedAt)) &&
      this.notDeduped(cycle, 'SALE_RECORDED')
    ) {
      return { key: 'SALE_RECORDED', ...SIGNAL_COPY.SALE_RECORDED }
    }

    const interestedCount = await countInterestedLeadsNeedingFollowup(businessId)
    if (interestedCount > 0 && this.notDeduped(cycle, 'INTERESTED_LEADS_NEED_FOLLOWUP')) {
      return {
        key: 'INTERESTED_LEADS_NEED_FOLLOWUP',
        headline: SIGNAL_COPY.INTERESTED_LEADS_NEED_FOLLOWUP.headline.replace(
          '{n}',
          String(interestedCount),
        ),
        actionLabel: SIGNAL_COPY.INTERESTED_LEADS_NEED_FOLLOWUP.actionLabel,
      }
    }

    if (
      (await pageTrafficNoLeads(businessId, cycle.actStartedAt)) &&
      this.notDeduped(cycle, 'PAGE_TRAFFIC_NO_LEADS')
    ) {
      return { key: 'PAGE_TRAFFIC_NO_LEADS', ...SIGNAL_COPY.PAGE_TRAFFIC_NO_LEADS }
    }

    return null
  }

  private notDeduped(cycle: AssistantGoalCycle, key: SignalKey): boolean {
    if (cycle.lastSignalKey !== key) return true
    // Same signal shown before — only suppress it if it was actually dismissed/acted on, not just
    // shown once and never revisited.
    return !cycle.lastSignalDismissedAt
  }
}
