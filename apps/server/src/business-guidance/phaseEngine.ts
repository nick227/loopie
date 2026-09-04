// Deterministic phase transitions (docs/.../02-feature-analysis.md section 9 + .../01-requirements
// .md's per-phase exit rules). Pure — no Prisma — so it's unit-testable without a DB;
// AssistantGoalCycleService gathers the real numbers (plan progress, elapsed time, signal
// evidence) and hands them in. Every decision carries a `reason` string for debugging/UI, per the
// docs' explicit requirement that phase transitions be explainable, not just correct.
import type { AssistantReviewOutcome } from '@prisma/client'

export function shouldEnterReview(ctx: {
  actStartedAt: Date | null
  totalSteps: number
  doneSteps: number
  minDaysElapsed: number
  minStepsDoneFraction: number
  hasUrgentSignal: boolean
}): { enter: boolean; reason: string } {
  if (!ctx.actStartedAt) return { enter: false, reason: 'The plan has not been scheduled yet.' }
  if (ctx.hasUrgentSignal) {
    return { enter: true, reason: 'A signal tied to this goal is worth reviewing now.' }
  }
  const doneFraction = ctx.totalSteps === 0 ? 0 : ctx.doneSteps / ctx.totalSteps
  if (doneFraction >= ctx.minStepsDoneFraction) {
    return { enter: true, reason: 'Enough of the plan is complete to check results.' }
  }
  const daysElapsed = (Date.now() - ctx.actStartedAt.getTime()) / (24 * 60 * 60 * 1000)
  if (daysElapsed >= ctx.minDaysElapsed) {
    return { enter: true, reason: 'The review window has passed.' }
  }
  return { enter: false, reason: 'Still executing the plan.' }
}

// The Review classification vocabulary (01-requirements.md's five outcome classes). NOT_EXECUTED
// is checked first — "time elapsed with insufficient execution" is itself a valid, distinct
// outcome, not a special case of NOT_WORKING. A sale is the clearest positive signal Loopie has;
// short of that, any real interest (an INTERESTED lead) counts as partial traction.
export function classifyReview(ctx: {
  doneFraction: number
  daysElapsed: number
  minDaysElapsed: number
  saleRecorded: boolean
  interestedLeadsCount: number
  hasEnoughEvidence: boolean
}): AssistantReviewOutcome {
  if (ctx.doneFraction === 0 && ctx.daysElapsed >= ctx.minDaysElapsed) return 'NOT_EXECUTED'
  if (ctx.saleRecorded) return 'WORKING'
  if (ctx.interestedLeadsCount > 0) return 'PARTIALLY_WORKING'
  if (!ctx.hasEnoughEvidence) return 'NOT_ENOUGH_DATA'
  return 'NOT_WORKING'
}

export type GrowDirection = 'DO_MORE' | 'IMPROVE' | 'NEW_CHANNEL' | 'INCREASE_GOAL' | 'NEW_GOAL'

// Grow's concrete next-direction choices (docs' Grow examples), scoped to what the review outcome
// actually supports — "Increase the goal" only makes sense after a working cycle, for instance.
export function growDirectionsFor(
  outcome: AssistantReviewOutcome,
): { value: GrowDirection; label: string }[] {
  switch (outcome) {
    case 'WORKING':
      return [
        { value: 'DO_MORE', label: 'Do more of this' },
        { value: 'INCREASE_GOAL', label: 'Increase the goal' },
        { value: 'NEW_GOAL', label: 'Work on another part of the business' },
      ]
    case 'PARTIALLY_WORKING':
      return [
        { value: 'IMPROVE', label: 'Improve the approach' },
        { value: 'DO_MORE', label: 'Do more of this' },
        { value: 'NEW_CHANNEL', label: 'Try another channel' },
      ]
    case 'NOT_WORKING':
    case 'NOT_EXECUTED':
      return [
        { value: 'IMPROVE', label: 'Improve the approach' },
        { value: 'NEW_CHANNEL', label: 'Try another channel' },
        { value: 'NEW_GOAL', label: 'Work on another part of the business' },
      ]
    case 'NOT_ENOUGH_DATA':
    default:
      return [
        { value: 'DO_MORE', label: 'Keep going a bit longer' },
        { value: 'NEW_GOAL', label: 'Work on another part of the business' },
      ]
  }
}
