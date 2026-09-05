// Durable business knowledge (docs/loopie-assistant-playbook-poc/01-requirements.md's "Reuse
// rule": known fact -> skip question). Two storage locations, one read model:
//   - targetCustomer -> Business.targetAudience — a genuinely canonical field the product already
//     has; the Assistant reads/writes it directly instead of duplicating it (see requirements
//     doc: "Existing canonical Business fields remain canonical").
//   - everything else -> Business.knowledge (a plain Json? column, same "no controlled vocabulary
//     yet" convention as Business.industry/socialProfiles) — facts with no existing home: the
//     venture taxonomy classification, primary goal/offer, constraint bands, and serviceArea.
// serviceArea ("how broadly this business serves customers" — a band like ONE_CITY/METRO_AREA)
// is NOT Business.location ("where the business is based," a free-text address/city). They are
// different facts about the business; a value from one must never be written into the other, so
// serviceArea lives in the knowledge blob like any other qualification-question answer.
// This module never touches Prisma directly — AssistantGoalCycleService owns the actual read/
// write, this is just the shape + a pure merge helper, so it stays unit-testable without a DB.
import type { BusinessTrait } from '../taxonomy/traits'
import type { TeamSizeBand } from '../types'

export type BusinessKnowledgeJson = {
  ventureFamily?: string
  businessGroup?: string
  ventureType?: string
  traits?: BusinessTrait[]
  primaryGoal?: string
  // Asked once, right after primaryGoal, before any playbook-specific qualification question —
  // see learnResolver.ts. Governs which playbook steps materialize (stepApplies in
  // AssistantGoalCycleService), so it must be known before a plan can be built.
  teamSize?: TeamSizeBand
  primaryOffer?: string
  serviceArea?: string
  marketingBudgetBand?: string
  weeklyGrowthTimeBand?: string
  customerGoalBand?: string
  acquisitionChannel?: string
  differentiator?: string
}

// The full read model the Learn resolver and Playbook selector reason over — targetCustomer is
// folded in from its canonical column so callers never have to know which storage a fact came
// from; serviceArea is already part of BusinessKnowledgeJson above.
export type BusinessKnowledge = BusinessKnowledgeJson & {
  targetCustomer?: string
}

export function readBusinessKnowledge(business: {
  knowledge: unknown
  targetAudience: string | null
  location: string | null
}): BusinessKnowledge {
  const stored = (business.knowledge as BusinessKnowledgeJson | null) ?? {}
  return {
    ...stored,
    targetCustomer: business.targetAudience ?? undefined,
  }
}

// Splits a single answered fact back into "does this belong on a canonical column, or in the
// knowledge blob" — the write-side mirror of readBusinessKnowledge. Returns only the piece(s) that
// changed so the caller can do one targeted Prisma update.
export function splitKnowledgeWrite(
  key: keyof BusinessKnowledge,
  value: string | string[],
): { targetAudience?: string; knowledgePatch?: Partial<BusinessKnowledgeJson> } {
  if (key === 'targetCustomer') return { targetAudience: value as string }
  return { knowledgePatch: { [key]: value } as Partial<BusinessKnowledgeJson> }
}
