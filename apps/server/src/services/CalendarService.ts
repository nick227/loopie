import { db } from '@project/db'
import type {
  GoalIdeaTemplate,
  ScheduledGoal,
  ScheduledGoalSource,
  GoalTrackingType,
} from '@prisma/client'
import { ensureSystemGoalIdeaTemplates } from '../lib/ensureSystemGoalIdeas'
import { localDayWindow, localWeekWindow, resolveHorizonDate } from '../lib/calendarWindows'
import {
  matchesBusinessType,
  isDynamicMetric,
  evaluateEligibility,
  computeProgress,
  resolveAction,
  satisfiedPrerequisiteTemplateIds,
  prerequisitesMet,
  countStaleQualifiedLeads,
  cooldownBlocks,
  lastCompletionByTemplate,
} from '../lib/coachRules'

// The one universal progression, in order — mirrors CoachStage. Used only to order/group the
// ideas pool and to compute the board's `currentStage` narrative; not itself a gate (see
// GoalIdeaTemplate.requiresTemplateIds's own comment for why stage isn't a blanket lock).
const STAGE_ORDER = ['FOUNDATION', 'ATTRACT', 'CAPTURE', 'CONVERT', 'GROW'] as const

// A handful of real next moves, not a checklist — 6 was the product's own call once the reserve
// library grew large enough that a bigger visible cap started surfacing weaker, more granular
// content alongside the genuinely big goals. Backed by packages/db/src/data/goalIdeas.ts's much
// larger catalog plus the repeatable/cooldown rule (see GoalIdeaTemplate.repeatable) so completing
// everything once doesn't run the well dry — there's always a next 6.
const MAX_IDEAS = 6
// "Keep completed work visible — completion should create a sense of progress" — a short rolling
// window, not a permanent history/archive view.
const RECENTLY_COMPLETED_DAYS = 14
const RECENTLY_COMPLETED_CAP = 8

type Horizon = 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'

// Deliberately no actionType/actionTarget/actionLabel here — "no direct Open action while it is
// still an idea" is a firm product rule, not just a UI choice: an idea is a possibility, not
// committed work, so it never gets a one-click destination. Scheduling is what earns that (see
// scheduleIdea, which resolves and freezes the action onto the resulting ScheduledGoal).
function toGoalIdeaDTO(
  template: GoalIdeaTemplate,
  overrides: { title?: string; targetValue?: number | null } = {},
) {
  return {
    templateId: template.id,
    title: overrides.title ?? template.title,
    detail: template.detail,
    ideaType: template.ideaType,
    subjectType: template.subjectType,
    stage: template.stage,
    isSystem: template.isSystem,
    defaultHorizon: (template.defaultHorizon as Horizon | null) ?? 'THIS_WEEK',
    defaultEstimateMinutes: template.defaultEstimateMinutes,
    trackingType: template.trackingType,
    metricKey: template.metricKey,
    targetValue: overrides.targetValue !== undefined ? overrides.targetValue : template.targetValue,
  }
}

function toScheduledGoalDTO(goal: ScheduledGoal, currentValue: number | null) {
  return {
    id: goal.id,
    title: goal.title,
    detail: goal.detail,
    source: goal.source,
    sourceTemplateId: goal.sourceTemplateId,
    subjectType: goal.subjectType,
    subjectId: goal.subjectId,
    trackingType: goal.trackingType,
    metricKey: goal.metricKey,
    targetValue: goal.targetValue,
    currentValue,
    estimateMinutes: goal.estimateMinutes,
    scheduledFor: goal.scheduledFor?.toISOString() ?? null,
    hasTime: goal.hasTime,
    status: goal.status,
    actionType: goal.actionType,
    actionTarget: goal.actionTarget,
    actionLabel: goal.actionLabel,
    completedAt: goal.completedAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
  }
}

type EligibleIdea = { template: GoalIdeaTemplate; title?: string; targetValue?: number | null }

// "Rank and diversify the pool so users don't see 12 ideas from the same category." Earlier
// stages still come first (the progression narrative isn't negotiable), but *within* a stage this
// round-robins across subjectType so Pages/Ads/CRM/Messaging/River all get a turn instead of
// whichever category happens to have the most eligible templates crowding everything else out.
// priorityWeight still breaks ties inside each category's own queue.
function selectDiverse(eligible: EligibleIdea[], cap: number): EligibleIdea[] {
  const byStage = new Map<number, Map<string, EligibleIdea[]>>()
  for (const item of eligible) {
    const stageIdx = STAGE_ORDER.indexOf(item.template.stage as (typeof STAGE_ORDER)[number])
    const stageBucket = byStage.get(stageIdx) ?? new Map<string, EligibleIdea[]>()
    const category = item.template.subjectType
    const categoryList = stageBucket.get(category) ?? []
    categoryList.push(item)
    stageBucket.set(category, categoryList)
    byStage.set(stageIdx, stageBucket)
  }
  for (const stageBucket of byStage.values()) {
    for (const categoryList of stageBucket.values()) {
      categoryList.sort((a, b) => b.template.priorityWeight - a.template.priorityWeight)
    }
  }

  const result: EligibleIdea[] = []
  for (let stageIdx = 0; stageIdx < STAGE_ORDER.length && result.length < cap; stageIdx++) {
    const stageBucket = byStage.get(stageIdx)
    if (!stageBucket) continue
    const queues = [...stageBucket.values()]
    let tookAny = true
    while (tookAny && result.length < cap) {
      tookAny = false
      for (const queue of queues) {
        const next = queue.shift()
        if (!next) continue
        result.push(next)
        tookAny = true
        if (result.length >= cap) break
      }
    }
  }
  return result
}

// "Do something -> Loopie understands what you accomplished -> suggests the logical next move."
// selectDiverse's stage/category ordering is deliberately blind to what a business just did — the
// lead-magnet chain (finish "publish a page for it" and the natural next move, "advertise it," is
// often still ranked below unrelated same-stage content and doesn't make the cut). Rather than
// permanently reweighting the template or touching selectDiverse's own diversity logic, this is a
// one-read-at-a-time swap: if the successor to whatever was JUST completed didn't make the diverse
// top `cap` on its own merit, bump it in by evicting the current lowest-priority *ordinary* (not
// itself boosted) slot. Genuinely temporary — recomputed fresh on every board read from
// `boostedIds`, which only ever contains successors of the single most-recently-completed
// template, so the moment anything else completes, the old boost simply stops being computed.
function applyContinuationBoost(
  result: EligibleIdea[],
  eligible: EligibleIdea[],
  boostedIds: Set<string>,
): EligibleIdea[] {
  if (boostedIds.size === 0) return result
  const resultIds = new Set(result.map((item) => item.template.id))
  const missingBoosted = eligible.filter(
    (item) => boostedIds.has(item.template.id) && !resultIds.has(item.template.id),
  )
  if (missingBoosted.length === 0) return result

  const next = [...result]
  for (const boosted of missingBoosted) {
    let evictIdx = -1
    let evictPriority = Infinity
    for (let i = 0; i < next.length; i++) {
      const candidate = next[i]!
      if (boostedIds.has(candidate.template.id)) continue // never evict another boosted idea
      if (candidate.template.priorityWeight < evictPriority) {
        evictPriority = candidate.template.priorityWeight
        evictIdx = i
      }
    }
    if (evictIdx === -1) break // no ordinary slot left to give up
    next[evictIdx] = boosted
  }
  return next
}

export class CalendarService {
  async getBoard(businessId: string, utcOffsetMinutes: number) {
    await ensureSystemGoalIdeaTemplates(db)
    await this.syncTrackedGoals(businessId)

    const now = new Date()
    const dayWindow = localDayWindow(now, utcOffsetMinutes)
    const weekWindow = localWeekWindow(now, utcOffsetMinutes)

    const [todayGoals, weekGoals, recentlyCompletedGoals, business] = await Promise.all([
      // Anything due today or earlier still shows here (rolled forward, not dropped) — no
      // separate "overdue" bucket or red state, per the product spec's forgiving-tone principle.
      db.scheduledGoal.findMany({
        where: { businessId, status: 'SCHEDULED', scheduledFor: { lt: dayWindow.end } },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      }),
      db.scheduledGoal.findMany({
        where: {
          businessId,
          status: 'SCHEDULED',
          scheduledFor: { gte: dayWindow.end, lt: weekWindow.end },
        },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      }),
      // "Keep it visible rather than making it disappear — completion should create a sense of
      // progress," not an ever-growing archive: a short recent window, capped.
      db.scheduledGoal.findMany({
        where: {
          businessId,
          status: 'DONE',
          completedAt: {
            gte: new Date(now.getTime() - RECENTLY_COMPLETED_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { completedAt: 'desc' },
        take: RECENTLY_COMPLETED_CAP,
      }),
      db.business.findUniqueOrThrow({ where: { id: businessId }, select: { industry: true } }),
    ])

    const [today, thisWeek, recentlyCompleted, { ideas, currentStage }] = await Promise.all([
      Promise.all(todayGoals.map((g) => this.hydrateGoal(g))),
      Promise.all(weekGoals.map((g) => this.hydrateGoal(g))),
      Promise.all(recentlyCompletedGoals.map((g) => this.hydrateGoal(g))),
      this.listIdeas(businessId, business.industry),
    ])

    return { data: { today, thisWeek, recentlyCompleted, ideas, currentStage } }
  }

  async createIdea(businessId: string, rawTitle: unknown) {
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
    if (!title) throw { statusCode: 400, message: 'Give this idea a title' }
    if (title.length > 200)
      throw { statusCode: 400, message: 'Keep the title under 200 characters' }

    const template = await db.goalIdeaTemplate.create({
      data: {
        businessId,
        isSystem: false,
        title,
        ideaType: 'ACTION',
        subjectType: 'GENERAL',
        stage: 'FOUNDATION',
        trackingType: 'MANUAL',
        defaultHorizon: 'THIS_WEEK',
        priorityWeight: 100,
      },
    })
    return { data: toGoalIdeaDTO(template) }
  }

  async dismissIdea(businessId: string, templateId: string) {
    const template = await this._findAccessibleTemplate(businessId, templateId)
    await db.goalIdeaState.upsert({
      where: { businessId_templateId: { businessId, templateId: template.id } },
      update: { dismissedAt: new Date() },
      create: { businessId, templateId: template.id, dismissedAt: new Date() },
    })
    return { data: { templateId: template.id } }
  }

  // Scheduling is a single click from the idea row: no popover, no When/Estimate choice — this
  // defaults straight to "this week" with the idea's own default estimate. The full When/Pick-
  // date/Estimate control still exists here for the detail view's "choose a different time"
  // option; the frontend just no longer forces everyone through it up front.
  // `overrides` is consulted only when passed — every existing Ideas-driven scheduling call (the
  // frontend's "schedule this idea" action) omits it, so behavior there is unchanged. It exists for
  // the Assistant's playbook scheduling (AssistantGoalCycleService.schedulePlan), which needs to
  // (a) tag the resulting rows to a goal cycle and (b) occasionally reuse a template whose own
  // trackingType/metricKey/title don't fit a fixed-plan step as-is — e.g. scheduling the existing
  // dynamic "N interested leads" idea as a plain Day-0 MANUAL reminder rather than a live metric.
  async scheduleIdea(
    businessId: string,
    templateId: string,
    input: {
      when?: Horizon | 'DATE'
      date?: string
      hasTime?: boolean
      estimateMinutes?: number | null
      utcOffsetMinutes?: number
    },
    overrides?: {
      source?: ScheduledGoalSource
      assistantGoalCycleId?: string
      titleOverride?: string
      targetValueOverride?: number | null
      trackingTypeOverride?: GoalTrackingType
    },
  ) {
    const template = await this._findAccessibleTemplate(businessId, templateId)
    const now = new Date()

    let scheduledFor: Date
    let hasTime = false
    if (input.when === 'DATE') {
      if (!input.date) throw { statusCode: 400, message: 'A date is required' }
      scheduledFor = new Date(input.date)
      if (Number.isNaN(scheduledFor.getTime())) {
        throw { statusCode: 400, message: 'Invalid date' }
      }
      hasTime = !!input.hasTime
    } else {
      const horizon: Horizon = input.when ?? 'THIS_WEEK'
      scheduledFor = resolveHorizonDate(horizon, now, input.utcOffsetMinutes ?? 0)
    }

    const estimateMinutes = input.estimateMinutes ?? template.defaultEstimateMinutes ?? null

    const [resolved, action] = await Promise.all([
      this._resolveTemplateForScheduling(template, businessId),
      resolveAction(template, businessId),
    ])

    const goal = await db.$transaction(async (tx) => {
      const created = await tx.scheduledGoal.create({
        data: {
          businessId,
          title: overrides?.titleOverride ?? resolved.title,
          detail: template.detail,
          source: overrides?.source ?? 'IDEA_TEMPLATE',
          sourceTemplateId: template.id,
          assistantGoalCycleId: overrides?.assistantGoalCycleId,
          subjectType: template.subjectType,
          trackingType: overrides?.trackingTypeOverride ?? template.trackingType,
          metricKey: template.metricKey,
          targetValue:
            overrides?.targetValueOverride !== undefined
              ? overrides.targetValueOverride
              : resolved.targetValue,
          estimateMinutes,
          scheduledFor,
          hasTime,
          status: 'SCHEDULED',
          actionType: action?.actionType,
          actionTarget: action?.actionTarget,
          actionLabel: action?.actionLabel,
        },
      })
      await tx.goalIdeaState.upsert({
        where: { businessId_templateId: { businessId, templateId: template.id } },
        update: { acceptedAt: new Date(), dismissedAt: null },
        create: { businessId, templateId: template.id, acceptedAt: new Date() },
      })
      await tx.goalEvent.create({ data: { goalId: created.id, type: 'CREATED' } })
      await tx.goalEvent.create({ data: { goalId: created.id, type: 'SCHEDULED' } })
      return created
    })

    return { data: await this.hydrateGoal(goal) }
  }

  async updateGoal(
    businessId: string,
    goalId: string,
    input: {
      status?: 'SCHEDULED' | 'DONE'
      scheduledFor?: string | null
      hasTime?: boolean
      estimateMinutes?: number | null
    },
  ) {
    const goal = await db.scheduledGoal.findFirst({ where: { id: goalId, businessId } })
    if (!goal) throw { statusCode: 404, message: 'Scheduled item not found' }

    const data: Record<string, unknown> = {}
    let eventType: 'COMPLETED' | 'RESCHEDULED' | null = null

    if (input.status === 'DONE' && goal.status !== 'DONE') {
      data.status = 'DONE'
      data.completedAt = new Date()
      eventType = 'COMPLETED'
    } else if (input.status === 'SCHEDULED' && goal.status !== 'SCHEDULED') {
      data.status = 'SCHEDULED'
      data.completedAt = null
    }
    if (input.scheduledFor !== undefined) {
      data.scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null
      data.reminderSentAt = null
      eventType = eventType ?? 'RESCHEDULED'
    }
    if (input.hasTime !== undefined) data.hasTime = input.hasTime
    if (input.estimateMinutes !== undefined) data.estimateMinutes = input.estimateMinutes

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.scheduledGoal.update({ where: { id: goalId }, data })
      if (eventType) await tx.goalEvent.create({ data: { goalId, type: eventType } })
      return result
    })

    return { data: await this.hydrateGoal(updated) }
  }

  // The Calendar (Week/Month) views' own read — arbitrary, navigable date range, unlike getBoard's
  // fixed "relative to now" buckets. A real calendar has to be able to show last month or next
  // month, not just this week; List view keeps using getBoard, Calendar view uses this.
  async listGoalsInRange(businessId: string, from: Date, to: Date) {
    const goals = await db.scheduledGoal.findMany({
      where: {
        businessId,
        status: { in: ['SCHEDULED', 'DONE'] },
        scheduledFor: { gte: from, lt: to },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    })
    return { data: await Promise.all(goals.map((g) => this.hydrateGoal(g))) }
  }

  // ---------- CRM integration (called from LeadService/ContactService) ----------

  // Mirrors Lead.nextActionAt/nextActionNote into Calendar so the existing "Next action" surface
  // on the Contact/Lead card is the one place a business sets a follow-up, and it shows up here
  // too — see ScheduledGoal's externalKey comment. Called from LeadService.update whenever
  // nextActionAt changes; a no-op business fact (Lead.nextActionNote/At) stays the system of
  // record, this is just the Calendar-visible reflection of it.
  async upsertCrmNextActionGoal(
    businessId: string,
    leadId: string,
    input: { note: string; at: Date; contactId: string },
  ) {
    const externalKey = `crm-next-action:${leadId}`
    const action = {
      actionType: 'NAVIGATE',
      actionTarget: `/contacts/${input.contactId}`,
      actionLabel: 'Open contact',
    }
    await db.scheduledGoal.upsert({
      where: { businessId_externalKey: { businessId, externalKey } },
      update: {
        title: input.note,
        scheduledFor: input.at,
        hasTime: hasMeaningfulTime(input.at),
        status: 'SCHEDULED',
        completedAt: null,
        dismissedAt: null,
        reminderSentAt: null,
        ...action,
      },
      create: {
        businessId,
        externalKey,
        title: input.note,
        source: 'CRM_NEXT_ACTION',
        subjectType: 'CRM',
        subjectId: leadId,
        trackingType: 'MANUAL',
        estimateMinutes: 15,
        scheduledFor: input.at,
        hasTime: hasMeaningfulTime(input.at),
        status: 'SCHEDULED',
        ...action,
      },
    })
  }

  async dismissCrmNextActionGoal(businessId: string, leadId: string) {
    const externalKey = `crm-next-action:${leadId}`
    await db.scheduledGoal
      .update({
        where: { businessId_externalKey: { businessId, externalKey } },
        data: { status: 'DISMISSED', dismissedAt: new Date() },
      })
      .catch(() => undefined) // nothing to dismiss — fine
  }

  // Closes the loop the product spec calls out: logging real CRM activity against a contact
  // completes any open Calendar work tied to that contact's current lead. Best-effort — never
  // throws into the activity-logging path that calls it.
  async completeCrmWorkOnActivity(businessId: string, contactId: string) {
    try {
      const lead = await db.lead.findFirst({
        where: { businessId, contactId, openSlot: 'OPEN' },
        select: { id: true },
      })
      if (!lead) return
      const open = await db.scheduledGoal.findMany({
        where: { businessId, subjectType: 'CRM', subjectId: lead.id, status: 'SCHEDULED' },
      })
      for (const goal of open) {
        await db.$transaction([
          db.scheduledGoal.update({
            where: { id: goal.id },
            data: { status: 'DONE', completedAt: new Date() },
          }),
          db.goalEvent.create({ data: { goalId: goal.id, type: 'COMPLETED' } }),
        ])
      }
    } catch (err) {
      console.error('Failed to auto-complete Calendar work from logged activity', err)
    }
  }

  // Called after a LandingPage publish so "Publish your homepage" completes immediately rather
  // than waiting for the next Calendar visit's syncTrackedGoals pass.
  async completePagePublishGoals(businessId: string) {
    try {
      await this.syncTrackedGoals(businessId, ['ANY_PAGE_PUBLISHED'])
    } catch (err) {
      console.error('Failed to sync Calendar goals after page publish', err)
    }
  }

  // ---------- internals ----------

  private async _findAccessibleTemplate(businessId: string, templateId: string) {
    const template = await db.goalIdeaTemplate.findFirst({
      where: { id: templateId, OR: [{ businessId: null }, { businessId }] },
    })
    if (!template) throw { statusCode: 404, message: 'Idea not found' }
    return template
  }

  private async _resolveTemplateForScheduling(template: GoalIdeaTemplate, businessId: string) {
    if (template.metricKey === 'QUALIFIED_LEAD_FOLLOWUPS_SINCE') {
      const n = await countStaleQualifiedLeads(businessId)
      return { title: template.title.replace('{n}', String(Math.max(n, 1))), targetValue: n || 1 }
    }
    return { title: template.title, targetValue: template.targetValue }
  }

  // Assembles the Ideas pool (see lib/coachRules.ts for the "is this eligible" question) and the
  // board's `currentStage` narrative in one pass over the same filtered set — the earliest stage,
  // in Foundation..Grow order, with anything still actionable in it.
  private async listIdeas(
    businessId: string,
    industry: string | null,
  ): Promise<{ ideas: ReturnType<typeof toGoalIdeaDTO>[]; currentStage: string | null }> {
    const templates = await db.goalIdeaTemplate.findMany({
      where: { OR: [{ businessId: null }, { businessId }] },
      orderBy: [{ priorityWeight: 'desc' }, { createdAt: 'asc' }],
    })
    if (templates.length === 0) return { ideas: [], currentStage: null }

    const customTemplateIds = templates.filter((t) => !t.isSystem).map((t) => t.id)
    const [states, activeGoals, everScheduledCustom, satisfiedPrereqs, lastCompletion] =
      await Promise.all([
        db.goalIdeaState.findMany({
          where: { businessId, templateId: { in: templates.map((t) => t.id) } },
        }),
        db.scheduledGoal.findMany({
          where: { businessId, status: 'SCHEDULED', sourceTemplateId: { not: null } },
          select: { sourceTemplateId: true },
        }),
        // A user's own one-off idea ("call the vet") is never meant to resurface once it's been
        // scheduled at all, done or not — unlike a system template (recurring, universal
        // suggestions like "Ask 3 customers for reviews"), which only needs to stay out of the pool
        // while a goal from it is still in flight. See ScheduledGoalStatus.
        customTemplateIds.length
          ? db.scheduledGoal.findMany({
              where: { businessId, sourceTemplateId: { in: customTemplateIds } },
              select: { sourceTemplateId: true },
            })
          : Promise.resolve([]),
        satisfiedPrerequisiteTemplateIds(businessId),
        lastCompletionByTemplate(
          businessId,
          templates.map((t) => t.id),
        ),
      ])
    const dismissed = new Set(states.filter((s) => s.dismissedAt).map((s) => s.templateId))
    const active = new Set(activeGoals.map((g) => g.sourceTemplateId!))
    const everUsedCustom = new Set(everScheduledCustom.map((g) => g.sourceTemplateId!))
    const templatesById = new Map(templates.map((t) => [t.id, t]))
    // Shared within this one board read: a dynamic template's eligibility is asked at most once,
    // whether that's for its own listing or as someone else's prerequisite check.
    const eligibilityCache = new Map<string, boolean>()

    // The single most recently completed template (if any) — see applyContinuationBoost's own
    // comment. `lastCompletion` already covers every template with at least one DONE goal, so this
    // is free: no extra query, and it only ever considers goals created from a template in the
    // first place (a plain user-typed task has no sourceTemplateId, so completing one never
    // triggers a "boost" — there's nothing downstream of it to boost).
    let mostRecentlyCompletedTemplateId: string | null = null
    let mostRecentCompletedAt: Date | null = null
    for (const [templateId, completedAt] of lastCompletion) {
      if (!mostRecentCompletedAt || completedAt > mostRecentCompletedAt) {
        mostRecentCompletedAt = completedAt
        mostRecentlyCompletedTemplateId = templateId
      }
    }

    const eligible: { template: GoalIdeaTemplate; title?: string; targetValue?: number | null }[] =
      []
    const boostedIds = new Set<string>()
    for (const template of templates) {
      if (dismissed.has(template.id) || active.has(template.id)) continue
      if (!matchesBusinessType(industry, template.businessTypes)) continue
      // "One-time ideas disappear when done; repeatable ideas can return after cooldowns" — only
      // ever a gate for a static template (see cooldownBlocks's own comment).
      if (cooldownBlocks(template, lastCompletion.get(template.id))) continue
      const unlocked = await prerequisitesMet(
        businessId,
        template.requiresTemplateIds,
        satisfiedPrereqs,
        templatesById,
        eligibilityCache,
      )
      if (!unlocked) continue

      if (
        mostRecentlyCompletedTemplateId &&
        Array.isArray(template.requiresTemplateIds) &&
        (template.requiresTemplateIds as unknown[]).includes(mostRecentlyCompletedTemplateId)
      ) {
        boostedIds.add(template.id)
      }

      if (!template.isSystem) {
        if (everUsedCustom.has(template.id)) continue
        eligible.push({ template })
        continue
      }
      if (!template.metricKey || !isDynamicMetric(template.metricKey)) {
        eligible.push({ template })
        continue
      }
      const evaluated = await evaluateEligibility(template, businessId)
      eligibilityCache.set(template.id, evaluated?.eligible ?? false)
      if (evaluated?.eligible) {
        eligible.push({ template, title: evaluated.title, targetValue: evaluated.targetValue })
      }
    }

    const top = applyContinuationBoost(selectDiverse(eligible, MAX_IDEAS), eligible, boostedIds)
    const ideas = top.map(({ template, title, targetValue }) =>
      toGoalIdeaDTO(template, { title, targetValue }),
    )
    const currentStage = eligible.length
      ? (STAGE_ORDER[
          Math.min(...eligible.map((e) => STAGE_ORDER.indexOf(e.template.stage as any)))
        ] ?? null)
      : null

    return { ideas, currentStage }
  }

  private async hydrateGoal(goal: ScheduledGoal) {
    return toScheduledGoalDTO(goal, await computeProgress(goal))
  }

  // Recomputes progress for every SCHEDULED, automatically-tracked goal and completes any that
  // have reached their target — called on every board read so state never looks stale to the
  // user, plus reactively from completePagePublishGoals for a snappier feel right after the
  // triggering event.
  private async syncTrackedGoals(businessId: string, onlyMetricKeys?: string[]) {
    const goals = await db.scheduledGoal.findMany({
      where: {
        businessId,
        status: 'SCHEDULED',
        trackingType: { in: ['ENTITY_STATE', 'COUNT'] },
        ...(onlyMetricKeys ? { metricKey: { in: onlyMetricKeys } } : {}),
      },
    })
    for (const goal of goals) {
      const currentValue = await computeProgress(goal)
      if (currentValue == null || goal.targetValue == null) continue
      if (currentValue >= goal.targetValue) {
        await db.$transaction([
          db.scheduledGoal.update({
            where: { id: goal.id },
            data: { status: 'DONE', completedAt: new Date(), currentValue },
          }),
          db.goalEvent.create({
            data: { goalId: goal.id, type: 'COMPLETED', metadata: { auto: true } },
          }),
        ])
      }
    }
  }
}

function hasMeaningfulTime(date: Date): boolean {
  return date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0
}
