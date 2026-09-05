import { db } from '@project/db'
import {
  countLeadsFlaggedForFollowUp,
  countInterestedLeadsNeedingProposal,
} from '../../lib/coachRules'
import { pageTrafficNoLeads } from '../../services/AssistantSignalService'
import type { ConversationInsight } from './types'

const PAGE_TRAFFIC_WINDOW_DAYS = 30

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

// Real-data-computed conversation content (2026-09-04 "dynamic for an established business" pass)
// — same compute-on-read discipline as AssistantSignalService's reactive signals, reusing their
// exact query helpers rather than duplicating them. Only ever included when the underlying
// condition genuinely holds; a business with no real data yet just sees the static corpus.
export async function resolveDynamicInsights(businessId: string): Promise<ConversationInsight[]> {
  const [saleStats, followUpCount, proposalCount, trafficNoLeads] = await Promise.all([
    db.sale.aggregate({
      where: { businessId, reversedAt: null },
      _avg: { amount: true },
      _count: true,
    }),
    countLeadsFlaggedForFollowUp(businessId),
    countInterestedLeadsNeedingProposal(businessId),
    pageTrafficNoLeads(businessId, daysAgo(PAGE_TRAFFIC_WINDOW_DAYS)),
  ])

  const insights: ConversationInsight[] = []

  if (saleStats._count >= 3 && saleStats._avg.amount) {
    const avg = Math.round(Number(saleStats._avg.amount))
    insights.push({
      id: 'dynamic-average-sale-value',
      category: 'RETENTION',
      headline: `Your average sale is $${avg.toLocaleString()}.`,
      detail: 'A small add-on offer to your next few customers raises that number directly.',
      chipLabel: 'Your average sale',
    })
  }

  const needingFollowUp = followUpCount + proposalCount
  if (needingFollowUp > 0) {
    insights.push({
      id: 'dynamic-leads-need-follow-up',
      category: 'SALES',
      headline:
        needingFollowUp === 1
          ? '1 lead is waiting on a follow-up.'
          : `${needingFollowUp} leads are waiting on a follow-up.`,
      detail: 'A lead that goes quiet for more than a couple of days rarely comes back on its own.',
      chipLabel: 'Leads waiting on you',
    })
  }

  if (trafficNoLeads) {
    insights.push({
      id: 'dynamic-page-traffic-no-leads',
      category: 'MARKETING',
      headline: 'Your page is getting visits but no submissions.',
      detail: 'That usually means the offer or the form is the problem, not the traffic.',
      chipLabel: 'Traffic without leads',
    })
  }

  return insights
}
