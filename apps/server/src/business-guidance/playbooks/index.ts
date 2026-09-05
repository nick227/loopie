// Playbook registry + selection (docs/.../02-feature-analysis.md section 8: "exact venture + goal
// > business group + goal > trait + goal > generic goal"). A playbook is pure content — no Prisma,
// no orchestration.
//
// Playbooks are organized into ordered layers (2026-09-04 "operating system, not a bag of tips"
// pass) rather than one flat, repeated step list — see PlaybookLayerKey below. Each layer's steps
// reference existing GoalIdeaTemplate ids wherever one already fits, and otherwise a new one added
// alongside this content (see each playbook file's own comment) — Calendar never grows a second
// task universe.
import type { BusinessTrait } from '../taxonomy/traits'
import type { BusinessKnowledge } from '../knowledge/businessKnowledge'
import type { AssistantChoiceStep, TeamSizeBand } from '../types'
import type { GoalTrackingType } from '@prisma/client'
import { localServiceGetCustomers } from './localServiceGetCustomers'
import { webDevelopmentGetCustomers } from './webDevelopmentGetCustomers'
import { designStudioGetCustomers } from './designStudioGetCustomers'

// The operating-system progression every playbook shares. A business works through these in
// order; "Do more of this" in Grow advances to the next one instead of repeating the last —
// see AssistantGoalCycleService.resolveNextLayer. Labels are shown in the plan card (real business
// content structure, unlike LEARN/ACT/REVIEW/GROW, which are never shown).
export type PlaybookLayerKey =
  | 'OFFER_AND_FOUNDATION'
  | 'LEAD_AND_SALES_PROCESS'
  | 'FULFILLMENT_AND_OPERATIONS'
  | 'TEAM_AND_DELEGATION'
  | 'SCALE_AND_SYSTEMS'

export type PlaybookStep = {
  templateId: string
  horizon: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'
  // A fixed title override — used when this step reuses a template whose own stored title doesn't
  // fit a fixed-plan step (e.g. a dynamic idea's "{n}"-templated title). Takes precedence over the
  // template's own title.
  title?: string
  // Resolves a concrete quantity from a knowledge band at plan-build time (e.g. customerGoalBand
  // 'FOUR_TO_TEN' -> 8) and is substituted into "Contact {n} prospects" — see
  // AssistantGoalCycleService's quantity resolution. Only set for steps whose title needs a number
  // Loopie can't know from the template alone.
  quantityFrom?: keyof BusinessKnowledge
  // Only set when this step reuses a template whose own trackingType/metricKey doesn't fit a
  // fixed-plan step (e.g. a dynamic "N interested leads" idea used here as a plain reminder) — see
  // CalendarService.scheduleIdea's overrides param.
  trackingTypeOverride?: GoalTrackingType
  // Only materialize this step when the business actually has this trait (e.g. an
  // equipment-maintenance step only for EQUIPMENT_HEAVY trades within a shared LOCAL playbook).
  requiresTrait?: BusinessTrait
  // Only materialize this step for a business at one of these team sizes (e.g. a "your first hire"
  // step only for SOLO, a "document your handoff process" step only once there's a team).
  requiresTeamSize?: TeamSizeBand[]
}

export type PlaybookLayer = {
  key: PlaybookLayerKey
  label: string
  steps: PlaybookStep[]
  // Only the last layer — once a business has worked through every layer, "Do more of this" keeps
  // offering this layer's steps again rather than dead-ending.
  repeatableOnceReached?: boolean
}

export type Playbook = {
  key: string
  goals: string[]
  ventureTypes?: string[]
  businessGroups?: string[]
  traits?: BusinessTrait[]
  requiredKnowledge: (keyof BusinessKnowledge)[]
  qualificationQuestions: AssistantChoiceStep[]
  layers: PlaybookLayer[]
  reviewTrigger: { minDaysElapsed: number; minStepsDoneFraction: number }
}

const playbooks: Playbook[] = [
  localServiceGetCustomers,
  webDevelopmentGetCustomers,
  designStudioGetCustomers,
]

function specificity(
  playbook: Playbook,
  ctx: { ventureType?: string; businessGroup?: string; traits: BusinessTrait[] },
): number {
  if (playbook.ventureTypes?.includes(ctx.ventureType ?? '')) return 3
  if (playbook.businessGroups?.includes(ctx.businessGroup ?? '')) return 2
  if (playbook.traits?.some((t) => ctx.traits.includes(t))) return 1
  if (!playbook.ventureTypes && !playbook.businessGroups && !playbook.traits) return 0
  return -1 // this playbook declared match constraints and none of them held
}

export function selectPlaybook(
  goal: string,
  ctx: { ventureType?: string; businessGroup?: string; traits: BusinessTrait[] },
): Playbook | undefined {
  let best: Playbook | undefined
  let bestScore = -1
  for (const playbook of playbooks) {
    if (!playbook.goals.includes(goal)) continue
    const score = specificity(playbook, ctx)
    if (score > bestScore) {
      bestScore = score
      best = playbook
    }
  }
  return bestScore >= 0 ? best : undefined
}

export function getPlaybook(key: string): Playbook | undefined {
  return playbooks.find((p) => p.key === key)
}
