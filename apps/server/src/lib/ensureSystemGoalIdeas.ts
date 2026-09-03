import type { Prisma } from '@prisma/client'
import {
  STATIC_GOAL_IDEA_TEMPLATES,
  DYNAMIC_GOAL_IDEA_TEMPLATES,
  type GoalIdeaTemplateSeed,
} from '@project/db'

type TemplateClient = {
  goalIdeaTemplate: {
    upsert: Prisma.TransactionClient['goalIdeaTemplate']['upsert']
    findMany: Prisma.TransactionClient['goalIdeaTemplate']['findMany']
    deleteMany: Prisma.TransactionClient['goalIdeaTemplate']['deleteMany']
  }
  scheduledGoal: {
    updateMany: Prisma.TransactionClient['scheduledGoal']['updateMany']
  }
}

function fields(seed: GoalIdeaTemplateSeed) {
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

// Lazy, idempotent content sync — same discipline as ensureSystemTemplates.ts (called from every
// read path that needs the content to exist, not from a startup migration). Safe to call on every
// request: upsert-by-id is a no-op once content is current.
export async function ensureSystemGoalIdeaTemplates(tx: TemplateClient) {
  const seeds = [...STATIC_GOAL_IDEA_TEMPLATES, ...DYNAMIC_GOAL_IDEA_TEMPLATES]
  for (const seed of seeds) {
    await tx.goalIdeaTemplate.upsert({
      where: { id: seed.id },
      update: fields(seed),
      create: { id: seed.id, businessId: null, isSystem: true, ...fields(seed) },
    })
  }
  // Retiring an idea from the catalog (goalIdeas.ts) only stops it being upserted above — the row
  // otherwise lingers forever and keeps competing for a visible slot. Unlike subjectId/subjectType,
  // sourceTemplateId IS a real FK (ScheduledGoal.template) — a past goal (even a completed one)
  // can still name a retired system id, so null out just those references first or this throws for
  // every business the next time anyone reads their board. The goal's own title/detail were
  // already copied at creation time, so losing the link back to the (now-gone) template changes
  // nothing visible. Scoped to isSystem rows specifically — a business's own "+ Add idea" custom
  // templates are never in `seeds` either, and must NOT be swept up as if they were orphans.
  const seedIds = seeds.map((seed) => seed.id)
  const orphans = await tx.goalIdeaTemplate.findMany({
    where: { isSystem: true, id: { notIn: seedIds } },
    select: { id: true },
  })
  if (orphans.length > 0) {
    const orphanIds = orphans.map((o) => o.id)
    await tx.scheduledGoal.updateMany({
      where: { sourceTemplateId: { in: orphanIds } },
      data: { sourceTemplateId: null },
    })
    await tx.goalIdeaTemplate.deleteMany({ where: { id: { in: orphanIds } } })
  }
}
