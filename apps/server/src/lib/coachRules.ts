import { db } from '@project/db'
import type { GoalIdeaTemplate, ScheduledGoal } from '@prisma/client'

// "Use Rules to decide which ideas are relevant now" — this module is that layer, kept separate
// from CalendarService's orchestration (board assembly, scheduling, CRUD) and from
// packages/db/src/data/goalIdeas.ts's content (the Ideas themselves). Three concerns, three
// places, matching the product's own vocabulary: Ideas (content) -> Rules (eligibility) ->
// Playbook (the fixed CoachStage progression these rules unlock through).
//
// Deterministic on purpose: every rule here is a real query against real product state (published
// pages, contacts, leads, ads, River posts), never an LLM call or a fuzzy score. "Ideas feel
// agentic because they unlock based on actual business state," not because they're generated.

const FOLLOW_UP_TOUCH_TYPES = [
  'FOLLOW_UP',
  'CALL_LOGGED',
  'EMAIL_SENT',
  'TEXT_SENT',
  'MEETING',
] as const
const STALE_QUALIFIED_STAGES = ['INTERESTED'] as const
const RIVER_QUIET_DAYS = 14

// Every metricKey lib/coachRules.ts (and packages/db/src/data/goalIdeas.ts) knows about — dynamic
// templates only; static ones (no metricKey, or metricKey used purely for progress like
// QUALIFIED_LEADS_TOTAL) are always offered once businessType-matched.
const DYNAMIC_METRIC_KEYS = new Set([
  'ANY_PAGE_PUBLISHED',
  'QUALIFIED_LEAD_FOLLOWUPS_SINCE',
  'DRAFT_AD_EXISTS',
  'NO_RECENT_RIVER_ACTIVITY',
  'BUSINESS_PROFILE_INCOMPLETE',
  'NO_CONTACTS',
  'NO_ADVERTISEMENT_EXISTS',
  'NO_MESSAGES_SENT_EVER',
  'WON_LEAD_WITHOUT_SALE',
  'NEW_LEAD_UNTOUCHED',
  'HAS_ANY_ADVERTISEMENT',
  'LEADS_FLAGGED_FOR_FOLLOW_UP',
  'INTERESTED_LEAD_NEEDS_PROPOSAL',
])

export function isDynamicMetric(metricKey: string): boolean {
  return DYNAMIC_METRIC_KEYS.has(metricKey)
}

// Loose keyword match against Business.industry, which is deliberately freeform (see its own
// schema comment) — there is no controlled industry taxonomy to key an exact match against.
export function matchesBusinessType(industry: string | null, businessTypes: unknown): boolean {
  if (!Array.isArray(businessTypes) || businessTypes.length === 0) return true
  if (!industry) return false
  const normalized = industry.toLowerCase()
  return businessTypes.some(
    (tag) => typeof tag === 'string' && normalized.includes(tag.toLowerCase()),
  )
}

export type ResolvedAction = {
  actionType: string
  actionTarget: string
  actionLabel: string
} | null

function staticAction(template: GoalIdeaTemplate): ResolvedAction {
  if (!template.actionTarget) return null
  return {
    actionType: template.actionType ?? 'NAVIGATE',
    actionTarget: template.actionTarget,
    actionLabel: template.actionLabel ?? 'Open',
  }
}

// Most templates' action is exactly what's stored on the row. A couple point at a *specific*
// record that only exists once the underlying condition is true (the draft page or draft ad this
// business actually has) — those are resolved here instead of being a fixed path.
export async function resolveAction(
  template: GoalIdeaTemplate,
  businessId: string,
): Promise<ResolvedAction> {
  switch (template.metricKey) {
    case 'ANY_PAGE_PUBLISHED': {
      const draft = await db.landingPage.findFirst({
        where: { businessId, deletedAt: null, status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      return draft
        ? {
            actionType: 'NAVIGATE',
            actionTarget: `/landing-pages/${draft.id}`,
            actionLabel: 'Continue editing',
          }
        : staticAction(template)
    }
    case 'DRAFT_AD_EXISTS': {
      const draft = await db.advertisement.findFirst({
        where: { businessId, deletedAt: null, publishedVersions: { none: {} } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      return draft
        ? {
            actionType: 'NAVIGATE',
            actionTarget: `/ads/${draft.id}`,
            actionLabel: 'Continue editing',
          }
        : staticAction(template)
    }
    default:
      return staticAction(template)
  }
}

export async function countStaleQualifiedLeads(businessId: string): Promise<number> {
  const leads = await db.lead.findMany({
    where: { businessId, openSlot: 'OPEN', stage: { in: [...STALE_QUALIFIED_STAGES] } },
    select: { contactId: true, openedAt: true },
  })
  if (leads.length === 0) return 0
  const contactIds = [...new Set(leads.map((l) => l.contactId))]
  const touches = await db.interaction.findMany({
    where: { businessId, contactId: { in: contactIds }, type: { in: [...FOLLOW_UP_TOUCH_TYPES] } },
    select: { contactId: true, occurredAt: true },
  })
  const lastTouch = new Map<string, Date>()
  for (const touch of touches) {
    const prev = lastTouch.get(touch.contactId)
    if (!prev || touch.occurredAt > prev) lastTouch.set(touch.contactId, touch.occurredAt)
  }
  let stale = 0
  for (const lead of leads) {
    const touch = lastTouch.get(lead.contactId)
    if (!touch || touch < lead.openedAt) stale++
  }
  return stale
}

async function countTouchedStaleLeadsSince(businessId: string, since: Date): Promise<number> {
  const leads = await db.lead.findMany({
    where: { businessId, openSlot: 'OPEN', stage: { in: [...STALE_QUALIFIED_STAGES] } },
    select: { contactId: true },
  })
  if (leads.length === 0) return 0
  const contactIds = [...new Set(leads.map((l) => l.contactId))]
  const touched = await db.interaction.findMany({
    where: {
      businessId,
      contactId: { in: contactIds },
      type: { in: [...FOLLOW_UP_TOUCH_TYPES] },
      occurredAt: { gte: since },
    },
    select: { contactId: true },
    distinct: ['contactId'],
  })
  return touched.length
}

// The eligibility question: is this idea worth surfacing to this business right now? Returns null
// for a metricKey this module doesn't recognize (defensive — should never happen for a template
// actually in the dynamic set).
export async function evaluateEligibility(
  template: GoalIdeaTemplate,
  businessId: string,
): Promise<{ eligible: boolean; title: string; targetValue: number | null } | null> {
  switch (template.metricKey) {
    case 'ANY_PAGE_PUBLISHED': {
      const published = await db.landingPage.count({ where: { businessId, status: 'PUBLISHED' } })
      return { eligible: published === 0, title: template.title, targetValue: template.targetValue }
    }
    case 'QUALIFIED_LEAD_FOLLOWUPS_SINCE': {
      const n = await countStaleQualifiedLeads(businessId)
      return { eligible: n > 0, title: template.title.replace('{n}', String(n)), targetValue: n }
    }
    case 'DRAFT_AD_EXISTS': {
      const draft = await db.advertisement.count({
        where: { businessId, deletedAt: null, publishedVersions: { none: {} } },
      })
      return { eligible: draft > 0, title: template.title, targetValue: template.targetValue }
    }
    case 'NO_RECENT_RIVER_ACTIVITY': {
      const since = new Date(Date.now() - RIVER_QUIET_DAYS * 24 * 60 * 60 * 1000)
      const recent = await db.riverPost.count({ where: { businessId, createdAt: { gte: since } } })
      return { eligible: recent === 0, title: template.title, targetValue: template.targetValue }
    }
    case 'BUSINESS_PROFILE_INCOMPLETE': {
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: { identityCompletedAt: true },
      })
      return {
        eligible: !business?.identityCompletedAt,
        title: template.title,
        targetValue: template.targetValue,
      }
    }
    case 'NO_CONTACTS': {
      const contacts = await db.contact.count({ where: { businessId } })
      return { eligible: contacts === 0, title: template.title, targetValue: template.targetValue }
    }
    case 'NO_ADVERTISEMENT_EXISTS': {
      const ads = await db.advertisement.count({ where: { businessId, deletedAt: null } })
      return { eligible: ads === 0, title: template.title, targetValue: template.targetValue }
    }
    case 'NO_MESSAGES_SENT_EVER': {
      const sent = await db.message.count({ where: { businessId, status: 'SENT' } })
      return { eligible: sent === 0, title: template.title, targetValue: template.targetValue }
    }
    case 'WON_LEAD_WITHOUT_SALE': {
      const missing = await countWonLeadsWithoutSale(businessId)
      return { eligible: missing > 0, title: template.title, targetValue: template.targetValue }
    }
    case 'NEW_LEAD_UNTOUCHED': {
      const n = await countUntouchedNewLeads(businessId)
      return { eligible: n > 0, title: template.title.replace('{n}', String(n)), targetValue: n }
    }
    case 'HAS_ANY_ADVERTISEMENT': {
      const ads = await db.advertisement.count({ where: { businessId, deletedAt: null } })
      return { eligible: ads > 0, title: template.title, targetValue: template.targetValue }
    }
    // "Who am I talking to, what happened, what should I do next" — the two rules below are the
    // CRM activity-checkbox slice's own answer to "what should I do next," reacting to the exact
    // fields the contact sales panel writes (lib/leadActivity.ts's LEAD_ACTIVITY_FLAGS), not to
    // Interaction history the way the older QUALIFIED_LEAD_FOLLOWUPS_SINCE rule does.
    case 'LEADS_FLAGGED_FOR_FOLLOW_UP': {
      const n = await countLeadsFlaggedForFollowUp(businessId)
      return { eligible: n > 0, title: template.title.replace('{n}', String(n)), targetValue: n }
    }
    case 'INTERESTED_LEAD_NEEDS_PROPOSAL': {
      const n = await countInterestedLeadsNeedingProposal(businessId)
      return { eligible: n > 0, title: template.title.replace('{n}', String(n)), targetValue: n }
    }
    default:
      return null
  }
}

// A lead someone explicitly flagged "needs follow-up" (the same checkbox the contact sales panel
// shows) that's still open — the most direct, lowest-inference signal the CRM has: a human already
// decided this needs action, Calendar just has to surface it.
async function countLeadsFlaggedForFollowUp(businessId: string): Promise<number> {
  return db.lead.count({ where: { businessId, openSlot: 'OPEN', followUp: true } })
}

// Real contact effort (a call, email, meeting, ...) already went in and the lead said yes — the
// obvious next move is a proposal, not more small talk. Deliberately stage-only (not further
// gated on "has been contacted"): a lead can reach INTERESTED from a form submission with no
// logged activity yet, and it should still prompt exactly the same next step.
async function countInterestedLeadsNeedingProposal(businessId: string): Promise<number> {
  return db.lead.count({
    where: { businessId, openSlot: 'OPEN', stage: 'INTERESTED', proposalSent: false },
  })
}

async function countWonLeadsWithoutSale(businessId: string): Promise<number> {
  const wonLeads = await db.lead.findMany({
    where: { businessId, stage: 'CLOSED' },
    select: { id: true },
  })
  if (wonLeads.length === 0) return 0
  const sales = await db.sale.findMany({
    where: { leadId: { in: wonLeads.map((l) => l.id) } },
    select: { leadId: true },
  })
  const withSale = new Set(sales.map((s) => s.leadId))
  return wonLeads.filter((l) => !withSale.has(l.id)).length
}

// A lead that just came in and has never had any real-world contact attempt logged against it —
// the highest-leverage moment in the whole pipeline (a fast first response measurably improves
// close rates), so this is deliberately its own idea rather than folded into the general
// stale-qualified-leads follow-up.
async function countUntouchedNewLeads(businessId: string): Promise<number> {
  const leads = await db.lead.findMany({
    where: { businessId, openSlot: 'OPEN', stage: 'NEW' },
    select: { contactId: true },
  })
  if (leads.length === 0) return 0
  const contactIds = [...new Set(leads.map((l) => l.contactId))]
  const touched = await db.interaction.findMany({
    where: { businessId, contactId: { in: contactIds }, type: { in: [...FOLLOW_UP_TOUCH_TYPES] } },
    select: { contactId: true },
    distinct: ['contactId'],
  })
  const touchedSet = new Set(touched.map((t) => t.contactId))
  return leads.filter((l) => !touchedSet.has(l.contactId)).length
}

// The progress question, for an already-scheduled ENTITY_STATE/COUNT goal: how close is it? Kept
// separate from evaluateEligibility above (a scheduled goal's metricKey may not even be a dynamic
// one — MANUAL goals never call this) but shares the same underlying counts where both apply.
export async function computeProgress(goal: ScheduledGoal): Promise<number | null> {
  if (goal.trackingType === 'MANUAL' || !goal.metricKey) return goal.currentValue
  switch (goal.metricKey) {
    case 'ANY_PAGE_PUBLISHED': {
      const published = await db.landingPage.count({
        where: { businessId: goal.businessId, status: 'PUBLISHED' },
      })
      return Math.min(published, goal.targetValue ?? 1)
    }
    case 'QUALIFIED_LEADS_TOTAL': {
      return db.lead.count({
        where: { businessId: goal.businessId, stage: { in: ['INTERESTED', 'CLOSED'] } },
      })
    }
    case 'QUALIFIED_LEAD_FOLLOWUPS_SINCE': {
      return countTouchedStaleLeadsSince(goal.businessId, goal.createdAt)
    }
    case 'RIVER_POSTS_SINCE': {
      return db.riverPost.count({
        where: { businessId: goal.businessId, createdAt: { gte: goal.createdAt } },
      })
    }
    case 'CONTACTS_ADDED_SINCE': {
      return db.contact.count({
        where: { businessId: goal.businessId, createdAt: { gte: goal.createdAt } },
      })
    }
    case 'SALES_AMOUNT_SINCE': {
      const result = await db.sale.aggregate({
        where: { businessId: goal.businessId, date: { gte: goal.createdAt } },
        _sum: { amount: true },
      })
      return Math.round(Number(result._sum.amount ?? 0))
    }
    default:
      return goal.currentValue
  }
}

// The reserve-library recurrence rule — see schema.prisma's GoalIdeaTemplate.repeatable doc
// comment. Only ever consulted for a static template (no metricKey): a dynamic one's own live
// eligibility check already governs when it can come back. A one-time template that's ever been
// completed is done forever; a repeatable one comes back `cooldownDays` after its most recent
// completion.
export function cooldownBlocks(
  template: Pick<GoalIdeaTemplate, 'metricKey' | 'repeatable' | 'cooldownDays'>,
  lastCompletedAt: Date | undefined,
): boolean {
  if (template.metricKey || !lastCompletedAt) return false
  if (!template.repeatable) return true
  const cooldownMs = (template.cooldownDays ?? 0) * 24 * 60 * 60 * 1000
  return Date.now() - lastCompletedAt.getTime() < cooldownMs
}

// One batched query for the whole board read, not one per template — same discipline as
// satisfiedPrerequisiteTemplateIds.
export async function lastCompletionByTemplate(
  businessId: string,
  templateIds: string[],
): Promise<Map<string, Date>> {
  if (templateIds.length === 0) return new Map()
  const done = await db.scheduledGoal.findMany({
    where: { businessId, status: 'DONE', sourceTemplateId: { in: templateIds } },
    select: { sourceTemplateId: true, completedAt: true },
  })
  const latest = new Map<string, Date>()
  for (const row of done) {
    if (!row.sourceTemplateId || !row.completedAt) continue
    const prev = latest.get(row.sourceTemplateId)
    if (!prev || row.completedAt > prev) latest.set(row.sourceTemplateId, row.completedAt)
  }
  return latest
}

// "Completing work unlocks the next useful suggestions" — the deterministic unlock gate. A
// required template counts as satisfied two ways: it has a DONE goal for this business (scheduled
// through Calendar and finished), OR — for a dynamic template — its live condition already
// evaluates to "not eligible," meaning the business achieved the underlying state some other way
// (e.g. published a homepage before ever touching Calendar). Without the second path, a business
// that did the real work outside Calendar would stay permanently locked out of everything gated
// behind it.
export async function satisfiedPrerequisiteTemplateIds(businessId: string): Promise<Set<string>> {
  const done = await db.scheduledGoal.findMany({
    where: { businessId, status: 'DONE', sourceTemplateId: { not: null } },
    select: { sourceTemplateId: true },
    distinct: ['sourceTemplateId'],
  })
  return new Set(done.map((g) => g.sourceTemplateId!))
}

export async function prerequisitesMet(
  businessId: string,
  requiresTemplateIds: unknown,
  doneTemplateIds: Set<string>,
  templatesById: Map<string, GoalIdeaTemplate>,
  eligibilityCache: Map<string, boolean>,
): Promise<boolean> {
  if (!Array.isArray(requiresTemplateIds) || requiresTemplateIds.length === 0) return true
  for (const id of requiresTemplateIds) {
    if (typeof id !== 'string') return false
    if (doneTemplateIds.has(id)) continue
    const template = templatesById.get(id)
    if (template?.metricKey && isDynamicMetric(template.metricKey)) {
      if (!eligibilityCache.has(id)) {
        const evaluated = await evaluateEligibility(template, businessId)
        eligibilityCache.set(id, evaluated?.eligible ?? true)
      }
      // eligible:false for a dynamic template means its condition is already satisfied in
      // reality (e.g. a page is already published) — that counts as "done" for unlocking.
      if (eligibilityCache.get(id) === false) continue
    }
    return false
  }
  return true
}
