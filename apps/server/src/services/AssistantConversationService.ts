import { findVentureNode } from '../business-guidance/taxonomy/ventures'
import type { BusinessTrait } from '../business-guidance/taxonomy/traits'
import type { BusinessKnowledge } from '../business-guidance/knowledge/businessKnowledge'
import type {
  ConversationCategory,
  ConversationInsight,
} from '../business-guidance/conversation/types'
import { GENERIC_INSIGHTS } from '../business-guidance/conversation/generic'
import { LOCAL_TRADES_INSIGHTS } from '../business-guidance/conversation/localTrades'
import { WEB_DEVELOPMENT_INSIGHTS } from '../business-guidance/conversation/webDevelopment'
import { DESIGN_STUDIO_INSIGHTS } from '../business-guidance/conversation/designStudio'
import { resolveDynamicInsights } from '../business-guidance/conversation/dynamicInsights'

const STATIC_CATALOG: ConversationInsight[] = [
  ...GENERIC_INSIGHTS,
  ...LOCAL_TRADES_INSIGHTS,
  ...WEB_DEVELOPMENT_INSIGHTS,
  ...DESIGN_STUDIO_INSIGHTS,
]

export type ConversationInsightDTO = {
  id: string
  category: ConversationCategory
  headline: string
  detail: string | null
  extended: string | null
  chipLabel: string
  relatedInsightIds: string[]
  isDynamic: boolean
}

export type ConversationPayload = {
  featuredId: string
  insights: ConversationInsightDTO[]
  categories: { category: ConversationCategory; count: number }[]
}

function specificity(
  insight: ConversationInsight,
  ctx: { ventureType?: string; businessGroup?: string; traits: BusinessTrait[] },
): number {
  if (insight.ventureTypes?.includes(ctx.ventureType ?? '')) return 3
  if (insight.businessGroups?.includes(ctx.businessGroup ?? '')) return 2
  if (insight.traits?.some((t) => ctx.traits.includes(t))) return 1
  if (!insight.ventureTypes && !insight.businessGroups && !insight.traits) return 0
  return -1 // this insight declared match constraints and none of them held
}

// Cheap, stateless string hash — deterministic rotation ("featured today") without persisting any
// per-viewer "seen" state. Good enough for "the tip changes day to day," not cryptographic.
function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function toDTO(insight: ConversationInsight, isDynamic: boolean): ConversationInsightDTO {
  return {
    id: insight.id,
    category: insight.category,
    headline: insight.headline,
    detail: insight.detail ?? null,
    extended: insight.extended ?? null,
    chipLabel: insight.chipLabel ?? insight.headline,
    relatedInsightIds: insight.relatedInsightIds ?? [],
    isDynamic,
  }
}

// Conversation — a browsable advice/knowledge corpus, wholly independent of Actions (see
// AssistantService.getNextAction / lib/assistantActions.ts). Layered but explorable: every
// eligible insight for this business's venture ships in one response so related-topic and
// category-rail navigation are pure client-side state, never a second round trip.
export class AssistantConversationService {
  async resolve(
    businessId: string,
    knowledge: BusinessKnowledge,
    signalCategory?: ConversationCategory | null,
  ): Promise<ConversationPayload> {
    const traits = knowledge.traits ?? findVentureNode(knowledge.ventureType ?? '')?.traits ?? []
    const ctx = {
      ventureType: knowledge.ventureType,
      businessGroup: knowledge.businessGroup,
      traits,
    }

    // Sorted by relevance (vertical-specific beats generic), not left in raw catalog order — this
    // is what lets a plain "take the next several" client-side read (AssistantConversationView's
    // teaser pool) stay relevance-first without needing to know about specificity itself. Ties
    // keep catalog order (a stable sort), so day-to-day rotation still only ever happens within
    // pickFeatured's own explicit tie-break below, not here.
    const eligible = STATIC_CATALOG.map((insight) => ({
      insight,
      score: specificity(insight, ctx),
    }))
      .filter((e) => e.score >= 0)
      .sort((a, b) => b.score - a.score)

    const dynamic = await resolveDynamicInsights(businessId)

    const insightDTOs: ConversationInsightDTO[] = [
      ...dynamic.map((i) => toDTO(i, true)),
      ...eligible.map((e) => toDTO(e.insight, false)),
    ]

    const categories = new Map<ConversationCategory, number>()
    for (const dto of insightDTOs) {
      categories.set(dto.category, (categories.get(dto.category) ?? 0) + 1)
    }

    const featuredId = this.pickFeatured(businessId, eligible, dynamic, signalCategory)

    return {
      featuredId,
      insights: insightDTOs,
      categories: Array.from(categories.entries()).map(([category, count]) => ({
        category,
        count,
      })),
    }
  }

  private pickFeatured(
    businessId: string,
    eligible: { insight: ConversationInsight; score: number }[],
    dynamic: ConversationInsight[],
    signalCategory?: ConversationCategory | null,
  ): string {
    // A live observation (real numbers — 3 interested leads, a $650 average sale, traffic with no
    // leads) usually beats static advice for the featured slot, so this checks dynamic content
    // before falling back to a signal-matched static tip: an active signal first prefers the
    // dynamic insight in its own category (the clearest, most relevant thing to feature) before
    // settling for generic-but-topical static content in that category.
    if (signalCategory) {
      const dynamicInCategory = dynamic.find((d) => d.category === signalCategory)
      if (dynamicInCategory) return dynamicInCategory.id
    }

    if (dynamic.length > 0) return dynamic[0]!.id

    if (signalCategory) {
      const inCategory = eligible.filter((e) => e.insight.category === signalCategory)
      const best = inCategory[0] // already relevance-sorted
      if (best) return best.insight.id
    }

    // Deterministic day-to-day rotation among the most specific eligible tier (vertical-specific
    // over generic when both exist) — stateless, no "seen" tracking.
    const topScore = eligible[0]?.score // already relevance-sorted, descending
    const topTier = eligible.filter((e) => e.score === topScore)
    if (topTier.length === 0) return eligible[0]?.insight.id ?? ''
    const today = new Date().toISOString().slice(0, 10)
    const index = hash(`${businessId}-${today}`) % topTier.length
    return topTier[index]!.insight.id
  }
}
