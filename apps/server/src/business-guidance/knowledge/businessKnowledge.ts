// Durable business knowledge (docs/loopie-assistant-playbook-poc/01-requirements.md's "Reuse
// rule": known fact -> skip question). Two storage locations, one read model:
//   - targetCustomer -> Business.targetAudience, serviceArea -> Business.location — genuinely
//     canonical fields the product already has; the Assistant reads/writes them directly instead
//     of duplicating them (see requirements doc: "Existing canonical Business fields remain
//     canonical").
//   - everything else -> Business.knowledge (a plain Json? column, same "no controlled vocabulary
//     yet" convention as Business.industry/socialProfiles) — facts with no existing home: the
//     venture taxonomy classification, primary goal/offer, and constraint bands.
// This module never touches Prisma directly — AssistantGoalCycleService owns the actual read/
// write, this is just the shape + a pure merge helper, so it stays unit-testable without a DB.
import type { BusinessTrait } from '../taxonomy/traits'

export type BusinessKnowledgeJson = {
  ventureFamily?: string
  businessGroup?: string
  ventureType?: string
  traits?: BusinessTrait[]
  primaryGoal?: string
  primaryOffer?: string
  marketingBudgetBand?: string
  weeklyGrowthTimeBand?: string
  customerGoalBand?: string
  acquisitionChannel?: string
  differentiator?: string
}

// The full read model the Learn resolver and Playbook selector reason over — targetCustomer/
// serviceArea are folded in from their canonical columns so callers never have to know which
// storage a fact came from.
export type BusinessKnowledge = BusinessKnowledgeJson & {
  targetCustomer?: string
  serviceArea?: string
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
    serviceArea: business.location ?? undefined,
  }
}

// Splits a single answered fact back into "does this belong on a canonical column, or in the
// knowledge blob" — the write-side mirror of readBusinessKnowledge. Returns only the piece(s) that
// changed so the caller can do one targeted Prisma update.
export function splitKnowledgeWrite(
  key: keyof BusinessKnowledge,
  value: string | string[],
): { targetAudience?: string; location?: string; knowledgePatch?: Partial<BusinessKnowledgeJson> } {
  if (key === 'targetCustomer') return { targetAudience: value as string }
  if (key === 'serviceArea') return { location: value as string }
  return { knowledgePatch: { [key]: value } as Partial<BusinessKnowledgeJson> }
}
