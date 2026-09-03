import { db } from '../../src/client'
import {
  STATIC_GOAL_IDEA_TEMPLATES,
  DYNAMIC_GOAL_IDEA_TEMPLATES,
  type GoalIdeaTemplateSeed,
} from '../../src/data/goalIdeas'

function templateFields(seed: GoalIdeaTemplateSeed) {
  return {
    title: seed.title,
    detail: seed.detail,
    ideaType: seed.ideaType,
    subjectType: seed.subjectType,
    stage: seed.stage,
    requiresTemplateIds: seed.requiresTemplateIds as any,
    actionType: seed.action ? 'NAVIGATE' : null,
    actionTarget: seed.action?.target ?? null,
    actionLabel: seed.action?.label ?? null,
    businessTypes: seed.businessTypes as any,
    defaultHorizon: seed.defaultHorizon,
    defaultEstimateMinutes: seed.defaultEstimateMinutes,
    trackingType: seed.trackingType,
    metricKey: seed.metricKey,
    targetValue: seed.targetValue,
    priorityWeight: seed.priorityWeight,
    repeatable: seed.repeatable,
    cooldownDays: seed.cooldownDays,
  }
}

// Content sync — same upsert-by-id as apps/server/src/lib/ensureSystemGoalIdeas.ts, duplicated
// here rather than imported (packages/db has no dependency on apps/server) so a fresh seed run
// always has current template content even before any request has lazily ensured it.
async function ensureTemplates() {
  const seeds = [...STATIC_GOAL_IDEA_TEMPLATES, ...DYNAMIC_GOAL_IDEA_TEMPLATES]
  for (const seed of seeds) {
    await db.goalIdeaTemplate.upsert({
      where: { id: seed.id },
      update: templateFields(seed),
      create: { id: seed.id, businessId: null, isSystem: true, ...templateFields(seed) },
    })
  }
  // Keep in sync with apps/server/src/lib/ensureSystemGoalIdeas.ts's own orphan cleanup — a
  // template retired from goalIdeas.ts should disappear from a freshly-seeded DB too. sourceTemplateId
  // is a real FK (ScheduledGoal.template), so null out any reference to a retired id before
  // deleting the row, and scope strictly to isSystem orphans so a business's own custom "+ Add
  // idea" templates (also absent from `seeds`) are never swept up.
  const seedIds = seeds.map((seed) => seed.id)
  const orphans = await db.goalIdeaTemplate.findMany({
    where: { isSystem: true, id: { notIn: seedIds } },
    select: { id: true },
  })
  if (orphans.length > 0) {
    const orphanIds = orphans.map((o) => o.id)
    await db.scheduledGoal.updateMany({
      where: { sourceTemplateId: { in: orphanIds } },
      data: { sourceTemplateId: null },
    })
    await db.goalIdeaTemplate.deleteMany({ where: { id: { in: orphanIds } } })
  }
}

function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d
}

// This calendar week's Friday at local midnight — the same Monday-based anchor the Week view's
// "All week" bucket looks for (CalendarPage.tsx's weekAnchorKey), so a genuinely day-agnostic
// item lands there regardless of which day of the week the seed happens to run on.
function thisWeekFriday(): Date {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const friday = new Date(now)
  friday.setDate(now.getDate() - mondayOffset + 4)
  friday.setHours(0, 0, 0, 0)
  return friday
}

async function upsertGoal(
  businessId: string,
  externalKey: string,
  data: {
    title: string
    sourceTemplateId?: string
    subjectType: 'GENERAL' | 'CRM' | 'ADVERTISEMENT' | 'PAGE' | 'RIVER' | 'BUSINESS'
    estimateMinutes: number
    scheduledFor: Date
    hasTime?: boolean
    status?: 'SCHEDULED' | 'DONE'
    completedAt?: Date
    trackingType?: 'MANUAL' | 'ENTITY_STATE' | 'COUNT'
    metricKey?: string
    targetValue?: number
  },
) {
  const shared = {
    title: data.title,
    scheduledFor: data.scheduledFor,
    hasTime: data.hasTime ?? false,
    status: data.status ?? 'SCHEDULED',
    completedAt: data.completedAt ?? null,
  }
  await db.scheduledGoal.upsert({
    where: { businessId_externalKey: { businessId, externalKey } },
    update: shared,
    create: {
      businessId,
      externalKey,
      source: 'IDEA_TEMPLATE',
      sourceTemplateId: data.sourceTemplateId,
      trackingType: data.trackingType ?? 'MANUAL',
      metricKey: data.metricKey,
      targetValue: data.targetValue,
      subjectType: data.subjectType,
      estimateMinutes: data.estimateMinutes,
      ...shared,
    },
  })
}

// Realistic Calendar state for both demo tenants — the "reseed and see business-specific ideas
// and scheduled CRM work" POC success criterion, and a Week view that isn't sparse on first
// look: several items spread across different days (some timed, some day-specific but untimed,
// one genuinely day-agnostic "this week" item), not just one or two.
export async function seedCalendarDemo(opts: {
  riversideId: string
  oakId: string
  janeLeadId: string
}) {
  await ensureTemplates()

  // Riverside: Jane's next action, kept in sync with Lead.nextActionNote/At exactly the way
  // LeadService.update does it live — the seed represents "a business that was already using
  // Calendar," not a fresh install.
  const janeFollowUp = at(1, 10, 0)
  const janeLead = await db.lead.update({
    where: { id: opts.janeLeadId },
    data: { nextActionNote: 'Follow up with Jane Smith', nextActionAt: janeFollowUp },
  })
  await db.scheduledGoal.upsert({
    where: {
      businessId_externalKey: {
        businessId: opts.riversideId,
        externalKey: `crm-next-action:${opts.janeLeadId}`,
      },
    },
    update: {
      scheduledFor: janeFollowUp,
      hasTime: true,
      status: 'SCHEDULED',
      completedAt: null,
      actionType: 'NAVIGATE',
      actionTarget: `/contacts/${janeLead.contactId}`,
      actionLabel: 'Open contact',
    },
    create: {
      businessId: opts.riversideId,
      externalKey: `crm-next-action:${opts.janeLeadId}`,
      title: 'Follow up with Jane Smith',
      source: 'CRM_NEXT_ACTION',
      subjectType: 'CRM',
      subjectId: opts.janeLeadId,
      trackingType: 'MANUAL',
      estimateMinutes: 15,
      scheduledFor: janeFollowUp,
      hasTime: true,
      status: 'SCHEDULED',
      actionType: 'NAVIGATE',
      actionTarget: `/contacts/${janeLead.contactId}`,
      actionLabel: 'Open contact',
    },
  })

  // A second, later timed callback the same week — proves the week grid isn't a one-item demo.
  await upsertGoal(opts.riversideId, 'demo-seed-review-quote-call', {
    title: 'Call about the detailing quote',
    subjectType: 'GENERAL',
    estimateMinutes: 20,
    scheduledFor: at(3, 14, 30),
    hasTime: true,
  })

  await upsertGoal(opts.riversideId, 'demo-seed-logo-hour', {
    title: 'Work on your logo for an hour',
    sourceTemplateId: 'system-idea-logo-hour',
    subjectType: 'BUSINESS',
    estimateMinutes: 60,
    scheduledFor: at(3, 0),
  })
  await upsertGoal(opts.riversideId, 'demo-seed-seasonal-offer', {
    title: 'Create a seasonal offer',
    sourceTemplateId: 'system-idea-seasonal-offer',
    subjectType: 'ADVERTISEMENT',
    estimateMinutes: 60,
    scheduledFor: at(4, 0),
  })
  // Deliberately day-agnostic (no specific day made sense yet) — the one item that should land
  // in the Week view's "All week" area rather than a specific day column.
  await upsertGoal(opts.riversideId, 'demo-seed-get-10-leads', {
    title: 'Get 10 qualified leads',
    sourceTemplateId: 'system-idea-get-10-qualified-leads',
    subjectType: 'CRM',
    estimateMinutes: 0,
    scheduledFor: thisWeekFriday(),
    trackingType: 'COUNT',
    metricKey: 'QUALIFIED_LEADS_TOTAL',
    targetValue: 10,
  })
  await upsertGoal(opts.riversideId, 'demo-seed-reviews-done', {
    title: 'Ask 3 customers for reviews',
    sourceTemplateId: 'system-idea-ask-for-reviews',
    subjectType: 'GENERAL',
    estimateMinutes: 20,
    scheduledFor: at(-2, 0),
    status: 'DONE',
    completedAt: at(-2, 14),
  })

  // Oak Street Bakery: a business-type-pack idea already scheduled (proves targeting works at
  // seed time too, not just live), a plain user-typed idea, and a timed one — its own varied week.
  await upsertGoal(opts.oakId, 'demo-seed-oak-specials', {
    title: "Share this week's specials",
    sourceTemplateId: 'system-idea-food-specials',
    subjectType: 'RIVER',
    estimateMinutes: 15,
    scheduledFor: at(0, 0),
  })
  await upsertGoal(opts.oakId, 'demo-seed-oak-supplier-call', {
    title: 'Call the flour supplier',
    subjectType: 'GENERAL',
    estimateMinutes: 15,
    scheduledFor: at(1, 9, 0),
    hasTime: true,
  })

  const oakCustomIdea = await db.goalIdeaTemplate.upsert({
    where: { id: 'demo-seed-oak-restock-idea' },
    update: {},
    create: {
      id: 'demo-seed-oak-restock-idea',
      businessId: opts.oakId,
      isSystem: false,
      title: 'Restock pastry boxes',
      ideaType: 'ACTION',
      subjectType: 'GENERAL',
      stage: 'FOUNDATION',
      trackingType: 'MANUAL',
      priorityWeight: 100,
    },
  })
  await upsertGoal(opts.oakId, 'demo-seed-oak-restock', {
    title: oakCustomIdea.title,
    sourceTemplateId: oakCustomIdea.id,
    subjectType: 'GENERAL',
    estimateMinutes: 30,
    scheduledFor: at(2, 0),
  })
}
