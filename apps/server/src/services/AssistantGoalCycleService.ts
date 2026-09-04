import { db } from '@project/db'
import type { AssistantGoalCycle, AssistantReviewOutcome } from '@prisma/client'
import { CalendarService } from './CalendarService'
import { ensureSystemGoalIdeaTemplates } from '../lib/ensureSystemGoalIdeas'
import {
  AssistantSignalService,
  saleRecordedSince,
  countInterestedLeadsNeedingFollowup,
} from './AssistantSignalService'
import { resolveLearnQuestion } from '../business-guidance/questions/learnResolver'
import { getPlaybook, type Playbook } from '../business-guidance/playbooks'
import {
  readBusinessKnowledge,
  splitKnowledgeWrite,
  type BusinessKnowledge,
  type BusinessKnowledgeJson,
} from '../business-guidance/knowledge/businessKnowledge'
import {
  shouldEnterReview,
  classifyReview,
  growDirectionsFor,
} from '../business-guidance/phaseEngine'
import type { AssistantAction, PlannedTaskDTO } from '../lib/assistantActions'

const calendarService = new CalendarService()
const signalService = new AssistantSignalService()

// Rough, deliberately simple band -> count map for CONTACT_PROSPECTS/SEND_TARGETED_OUTREACH's
// "contact {n} prospects" — the actual quantity is advisory copy, not something the plan enforces,
// so a coarse mapping is enough for the POC.
const CUSTOMER_GOAL_TO_PROSPECT_COUNT: Record<string, number> = {
  ONE_TO_THREE: 6,
  FOUR_TO_TEN: 10,
  TEN_PLUS: 20,
}

const REVIEW_OUTCOME_COPY: Record<AssistantReviewOutcome, { headline: string; detail?: string }> = {
  WORKING: { headline: 'This approach produced real results.', detail: 'Worth doing more of.' },
  PARTIALLY_WORKING: {
    headline: 'This approach is showing some traction.',
    detail: 'A few changes could help it further.',
  },
  NOT_WORKING: { headline: "This approach hasn't produced results yet." },
  NOT_ENOUGH_DATA: { headline: "There's not enough evidence yet to say." },
  NOT_EXECUTED: { headline: "This plan hasn't really been worked yet." },
}

function resolveProspectCount(knowledge: BusinessKnowledge): number {
  const band = knowledge.customerGoalBand
  return CUSTOMER_GOAL_TO_PROSPECT_COUNT[band ?? ''] ?? 10
}

function stepTitle(
  step: Playbook['steps'][number],
  knowledge: BusinessKnowledge,
  templateTitle: string | undefined,
): string {
  if (step.title) return step.title
  if (step.quantityFrom) return `Contact ${resolveProspectCount(knowledge)} prospects`
  return templateTitle ?? step.templateId
}

// Learn -> Act -> Review -> Grow orchestration (docs/loopie-assistant-playbook-poc/). Content
// (taxonomy/goals/playbooks/phase rules) is entirely declarative in business-guidance/; this
// service is the one place that touches Prisma and calls into CalendarService, same "content vs
// engine" split coachRules.ts/CalendarService already established for Ideas.
export class AssistantGoalCycleService {
  // The read path — called from AssistantService.getNextAction. Also the return value of every
  // mutation below, so the client always re-fetches through one place after any action.
  async resolveAction(businessId: string): Promise<AssistantAction | null> {
    // Playbook steps reference GoalIdeaTemplate rows (system content) — same lazy-ensure call site
    // as CalendarService.getBoard, so the plan preview/schedule always has real templates to read/
    // schedule against, whether or not Calendar's own board has ever been opened yet.
    await ensureSystemGoalIdeaTemplates(db)
    let cycle = await db.assistantGoalCycle.findFirst({ where: { businessId, status: 'ACTIVE' } })
    const knowledge = await this.readKnowledge(businessId)

    if (!cycle || cycle.phase === 'LEARN') {
      const result = resolveLearnQuestion(knowledge)
      if (!result.done) {
        return {
          type: 'GOAL_CYCLE',
          actionId: 'learn_step',
          operationId: null,
          cycleId: cycle?.id ?? null,
          step: result.step,
          knownFacts: result.knownFacts,
        }
      }
      if (!result.playbookKey || !cycle) {
        // A goal with no POC playbook (anything but GET_MORE_CUSTOMERS), or a goal answered but no
        // cycle row yet (shouldn't happen — answer() always creates one on primaryGoal). Either
        // way, nothing more for the goal-cycle slot to show; the existing chain/Calendar take over.
        return null
      }
      if (!cycle.playbookKey) {
        cycle = await db.assistantGoalCycle.update({
          where: { id: cycle.id },
          data: { playbookKey: result.playbookKey },
        })
      }
      const plan = await this.buildPlanPreview(cycle.playbookKey!, knowledge)
      return {
        type: 'GOAL_CYCLE',
        actionId: 'build_plan',
        operationId: null,
        cycleId: cycle.id,
        plan,
      }
    }

    if (cycle.phase === 'ACT') {
      const playbook = getPlaybook(cycle.playbookKey ?? '')
      if (!playbook) return null

      const [progress, signal] = await Promise.all([
        this.actProgress(cycle.id),
        signalService.findSignal(businessId, cycle),
      ])
      const reviewWorthy =
        signal?.key === 'SALE_RECORDED' || signal?.key === 'PAGE_TRAFFIC_NO_LEADS'
      const { enter } = shouldEnterReview({
        actStartedAt: cycle.actStartedAt,
        totalSteps: progress.total,
        doneSteps: progress.done,
        minDaysElapsed: playbook.reviewTrigger.minDaysElapsed,
        minStepsDoneFraction: playbook.reviewTrigger.minStepsDoneFraction,
        hasUrgentSignal: !!reviewWorthy,
      })

      if (enter) {
        // Review's own exit criterion is "enough evidence to classify AND present a next
        // direction" (01-requirements.md) — so classifying immediately advances to GROW rather
        // than resting in a separate REVIEW screen the user has to click through.
        await this.classifyAndAdvanceToGrow(cycle, playbook, progress)
      }

      if (signal) {
        const actionTarget = await this.signalActionTarget(businessId, signal.key)
        return {
          type: 'SIGNAL',
          actionId: signalActionId(signal.key),
          operationId: null,
          cycleId: cycle.id,
          signalSummary: {
            headline: signal.headline,
            detail: signal.detail,
            actionLabel: signal.actionLabel,
            actionTarget,
          },
        }
      }

      if (enter) return this.resolveAction(businessId) // re-read: cycle is now GROW

      return null // still executing — let the rest of the chain / Calendar take over
    }

    if (cycle.phase === 'GROW') {
      const outcome = cycle.reviewOutcome ?? 'NOT_ENOUGH_DATA'
      const copy = REVIEW_OUTCOME_COPY[outcome]
      return {
        type: 'GOAL_CYCLE',
        actionId: 'grow',
        operationId: null,
        cycleId: cycle.id,
        growSummary: { ...copy, directions: growDirectionsFor(outcome) },
      }
    }

    return null
  }

  async answer(businessId: string, input: { questionKey: string; value: string | string[] }) {
    const business = await db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { knowledge: true, targetAudience: true, location: true },
    })
    const patch = splitKnowledgeWrite(input.questionKey as keyof BusinessKnowledge, input.value)
    await db.business.update({
      where: { id: businessId },
      data: {
        ...(patch.targetAudience !== undefined ? { targetAudience: patch.targetAudience } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.knowledgePatch
          ? {
              knowledge: {
                ...((business.knowledge as BusinessKnowledgeJson | null) ?? {}),
                ...patch.knowledgePatch,
              },
            }
          : {}),
      },
    })

    const existing = await db.assistantGoalCycle.findFirst({
      where: { businessId, status: 'ACTIVE' },
    })
    if (input.questionKey === 'primaryGoal' && !existing) {
      await db.assistantGoalCycle.create({
        data: { businessId, goal: input.value as string, phase: 'LEARN' },
      })
    }

    return this.resolveAction(businessId)
  }

  async schedulePlan(businessId: string, cycleId: string) {
    await ensureSystemGoalIdeaTemplates(db)
    const cycle = await db.assistantGoalCycle.findFirst({
      where: { id: cycleId, businessId, status: 'ACTIVE' },
    })
    if (!cycle) throw { statusCode: 404, message: 'Goal cycle not found' }
    if (cycle.phase !== 'LEARN' || !cycle.playbookKey) {
      throw { statusCode: 400, message: 'This plan is not ready to schedule yet' }
    }
    const playbook = getPlaybook(cycle.playbookKey)
    if (!playbook) throw { statusCode: 400, message: 'Unknown playbook' }

    const knowledge = await this.readKnowledge(businessId)
    for (const step of playbook.steps) {
      const templateTitle = await this.templateTitle(step.templateId)
      await calendarService.scheduleIdea(
        businessId,
        step.templateId,
        { when: step.horizon },
        {
          source: 'ASSISTANT_PLAYBOOK',
          assistantGoalCycleId: cycle.id,
          titleOverride: stepTitle(step, knowledge, templateTitle),
          trackingTypeOverride: step.trackingTypeOverride,
        },
      )
    }

    await db.assistantGoalCycle.update({
      where: { id: cycle.id },
      data: { phase: 'ACT', actStartedAt: new Date() },
    })
    return this.resolveAction(businessId)
  }

  // Manual/forced re-check — mostly useful right after a signal card's "Review" click so the
  // client doesn't have to wait for the next natural getNextAction poll. Recomputes the same way
  // the ACT-phase branch of resolveAction does; a no-op if the cycle isn't ready to enter Review.
  async review(businessId: string, cycleId: string, manualOutcome?: AssistantReviewOutcome) {
    const cycle = await db.assistantGoalCycle.findFirst({
      where: { id: cycleId, businessId, status: 'ACTIVE' },
    })
    if (!cycle) throw { statusCode: 404, message: 'Goal cycle not found' }
    if (cycle.phase === 'ACT') {
      const playbook = getPlaybook(cycle.playbookKey ?? '')
      if (playbook) {
        if (manualOutcome) {
          await db.assistantGoalCycle.update({
            where: { id: cycle.id },
            data: { phase: 'GROW', reviewOutcome: manualOutcome, reviewedAt: new Date() },
          })
        } else {
          const progress = await this.actProgress(cycle.id)
          await this.classifyAndAdvanceToGrow(cycle, playbook, progress)
        }
      }
    }
    return this.resolveAction(businessId)
  }

  async grow(businessId: string, cycleId: string, direction: string) {
    const cycle = await db.assistantGoalCycle.findFirst({
      where: { id: cycleId, businessId, status: 'ACTIVE' },
    })
    if (!cycle) throw { statusCode: 404, message: 'Goal cycle not found' }
    if (cycle.phase !== 'GROW')
      throw { statusCode: 400, message: 'This cycle is not ready to grow yet' }

    await db.assistantGoalCycle.update({
      where: { id: cycle.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    // NEW_GOAL routes back through Learn from scratch (a materially different goal, per
    // 01-requirements.md's Grow section); every other direction re-runs the same playbook/goal —
    // Learn is skipped entirely since venture/goal/qualification facts are already known.
    if (direction === 'NEW_GOAL') {
      return this.resolveAction(businessId) // no ACTIVE cycle now -> Learn resumes at primary_goal
    }

    await db.assistantGoalCycle.create({
      data: { businessId, goal: cycle.goal, playbookKey: cycle.playbookKey, phase: 'LEARN' },
    })
    // playbookKey/goal are already known, so the very next resolveAction call will fall straight
    // through Learn (no unanswered questions remain) into a fresh build_plan for the same playbook.
    return this.resolveAction(businessId)
  }

  // `signalKey` here is the client-facing actionId form (e.g. 'sale_recorded') — the frontend only
  // ever sees actionId, never the internal uppercase SignalKey — so this converts back before
  // storing, the exact reverse of signalActionId below.
  async dismissSignal(businessId: string, cycleId: string, signalKey: string) {
    const internalKey = toInternalSignalKey(signalKey)
    if (!internalKey) return
    await db.assistantGoalCycle
      .update({
        where: { id: cycleId },
        data: { lastSignalKey: internalKey, lastSignalDismissedAt: new Date() },
      })
      .catch(() => undefined)
  }

  // ---------- internals ----------

  private async readKnowledge(businessId: string): Promise<BusinessKnowledge> {
    const business = await db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { knowledge: true, targetAudience: true, location: true },
    })
    return readBusinessKnowledge(business)
  }

  private async templateTitle(templateId: string): Promise<string | undefined> {
    const template = await db.goalIdeaTemplate.findUnique({
      where: { id: templateId },
      select: { title: true },
    })
    return template?.title
  }

  private async buildPlanPreview(
    playbookKey: string,
    knowledge: BusinessKnowledge,
  ): Promise<PlannedTaskDTO[]> {
    const playbook = getPlaybook(playbookKey)
    if (!playbook) return []
    const templates = await db.goalIdeaTemplate.findMany({
      where: { id: { in: playbook.steps.map((s) => s.templateId) } },
      select: { id: true, title: true },
    })
    const titleById = new Map(templates.map((t) => [t.id, t.title]))
    return playbook.steps.map((step) => ({
      templateId: step.templateId,
      title: stepTitle(step, knowledge, titleById.get(step.templateId)),
      horizon: step.horizon,
    }))
  }

  private async actProgress(cycleId: string): Promise<{ total: number; done: number }> {
    const [total, done] = await Promise.all([
      db.scheduledGoal.count({ where: { assistantGoalCycleId: cycleId } }),
      db.scheduledGoal.count({ where: { assistantGoalCycleId: cycleId, status: 'DONE' } }),
    ])
    return { total, done }
  }

  private async classifyAndAdvanceToGrow(
    cycle: AssistantGoalCycle,
    playbook: Playbook,
    progress: { total: number; done: number },
  ): Promise<void> {
    const doneFraction = progress.total === 0 ? 0 : progress.done / progress.total
    const daysElapsed = cycle.actStartedAt
      ? (Date.now() - cycle.actStartedAt.getTime()) / (24 * 60 * 60 * 1000)
      : 0
    const [saleRecorded, interestedLeadsCount] = await Promise.all([
      cycle.actStartedAt
        ? saleRecordedSince(cycle.businessId, cycle.actStartedAt)
        : Promise.resolve(false),
      countInterestedLeadsNeedingFollowup(cycle.businessId),
    ])
    const outcome = classifyReview({
      doneFraction,
      daysElapsed,
      minDaysElapsed: playbook.reviewTrigger.minDaysElapsed,
      saleRecorded,
      interestedLeadsCount,
      hasEnoughEvidence: doneFraction > 0 || daysElapsed >= playbook.reviewTrigger.minDaysElapsed,
    })
    await db.assistantGoalCycle.update({
      where: { id: cycle.id },
      data: { phase: 'GROW', reviewOutcome: outcome, reviewedAt: new Date() },
    })
  }

  private async signalActionTarget(businessId: string, key: string): Promise<string | null> {
    if (key === 'INTERESTED_LEADS_NEED_FOLLOWUP') return '/leads'
    if (key === 'PAGE_TRAFFIC_NO_LEADS') {
      const page = await db.landingPage.findFirst({
        where: { businessId, deletedAt: null, status: 'PUBLISHED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      return page ? `/landing-pages/${page.id}` : '/landing-pages'
    }
    return null // SALE_RECORDED — phase has already advanced to GROW; the click just refreshes
  }
}

function signalActionId(
  key: 'PAGE_TRAFFIC_NO_LEADS' | 'INTERESTED_LEADS_NEED_FOLLOWUP' | 'SALE_RECORDED',
): 'page_traffic_no_leads' | 'interested_leads_followup' | 'sale_recorded' {
  switch (key) {
    case 'PAGE_TRAFFIC_NO_LEADS':
      return 'page_traffic_no_leads'
    case 'INTERESTED_LEADS_NEED_FOLLOWUP':
      return 'interested_leads_followup'
    case 'SALE_RECORDED':
      return 'sale_recorded'
  }
}

function toInternalSignalKey(
  actionId: string,
): 'PAGE_TRAFFIC_NO_LEADS' | 'INTERESTED_LEADS_NEED_FOLLOWUP' | 'SALE_RECORDED' | null {
  switch (actionId) {
    case 'page_traffic_no_leads':
      return 'PAGE_TRAFFIC_NO_LEADS'
    case 'interested_leads_followup':
      return 'INTERESTED_LEADS_NEED_FOLLOWUP'
    case 'sale_recorded':
      return 'SALE_RECORDED'
    default:
      return null
  }
}
