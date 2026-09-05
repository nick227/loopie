import type { BusinessTrait } from '../taxonomy/traits'

// Conversation is a browsable advice/knowledge corpus — ongoing business advice the user can read
// for its own sake, independent of whether Loopie wants them to *do* anything right now (see
// AssistantAction/lib/assistantActions.ts for that separate, executable concept). Layered but
// explorable, not sequential: a three-person lawn business can read equipment-maintenance advice
// today even with an incomplete marketing foundation — this is a content-organization taxonomy,
// not the playbook's ordered progression (business-guidance/playbooks/index.ts's
// PlaybookLayerKey), which is a deliberately separate concept.
export type ConversationCategory =
  'FOUNDATION' | 'MARKETING' | 'SALES' | 'OPERATIONS' | 'TEAM' | 'EQUIPMENT' | 'RETENTION' | 'SCALE'

export type ConversationInsight = {
  id: string
  category: ConversationCategory
  // Same style contract as business-guidance/types.ts: atomic, one concrete idea, imperative/
  // statement phrasing never a question. "Set a minimum price for every stop," not "Have you set
  // a minimum price?"
  headline: string
  // One short supporting sentence, only when it adds real information.
  detail?: string
  // A fuller paragraph, shown only on "Keep reading" — optional; when absent, "Keep reading"
  // advances to the next insight in the same category instead.
  extended?: string
  // Short label used when this insight appears as someone else's related-topic chip (falls back
  // to `headline` if absent — but headline is often a full sentence, so most insights that are
  // worth linking to should set this).
  chipLabel?: string
  // 1-3 thematically related insight ids — not a generic "see more in this category" link, a
  // real, authored connection (e.g. a minimum-pricing insight links to a route-planning insight
  // and vice versa).
  relatedInsightIds?: string[]
  // Same specificity precedent as playbooks/index.ts's selectPlaybook: exact ventureType beats
  // businessGroup beats trait beats an unconditional generic entry.
  ventureTypes?: string[]
  businessGroups?: string[]
  traits?: BusinessTrait[]
}
