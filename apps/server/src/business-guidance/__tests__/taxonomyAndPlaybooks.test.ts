// Pure unit tests — no DB, no HTTP — for the business-guidance content layer itself: taxonomy
// traversal, known-fact skipping, playbook selection precedence, and phase transitions. See
// docs/loopie-assistant-playbook-poc/03-poc-implementation-plan.md section 17's "Unit" list.
import { describe, it, expect } from 'vitest'
import { ventureTaxonomy, findVentureNode } from '../taxonomy/ventures'
import { resolveLearnQuestion } from '../questions/learnResolver'
import { selectPlaybook, getPlaybook } from '../playbooks'
import { shouldEnterReview, classifyReview, growDirectionsFor } from '../phaseEngine'
import type { BusinessKnowledge } from '../knowledge/businessKnowledge'

describe('venture taxonomy', () => {
  it('every non-leaf node has children, and every choice list stays within 3-7 options', () => {
    function walk(nodes: typeof ventureTaxonomy, depth: number) {
      expect(nodes.length).toBeGreaterThanOrEqual(1)
      expect(nodes.length).toBeLessThanOrEqual(7)
      for (const node of nodes) {
        if (depth < 2) {
          // Family and group levels are navigation — a leaf this shallow would be a dead end.
          expect(node.children?.length ?? 0).toBeGreaterThan(0)
        }
        if (node.children) walk(node.children, depth + 1)
      }
    }
    walk(ventureTaxonomy, 0)
  })

  it('finds a deeply nested node by key', () => {
    expect(findVentureNode('ROOFING')?.label).toBe('Roofing')
    expect(findVentureNode('WEB_DEVELOPMENT')?.traits).toContain('ONLINE')
    expect(findVentureNode('NOT_A_REAL_KEY')).toBeUndefined()
  })
})

describe('resolveLearnQuestion — known fact -> skip question', () => {
  it('walks venture family -> group -> type -> goal -> qualification for a brand new business', () => {
    let knowledge: BusinessKnowledge = {}

    const family = resolveLearnQuestion(knowledge)
    expect(family.done).toBe(false)
    if (family.done) throw new Error('unreachable')
    expect(family.step.key).toBe('venture_family')
    expect(family.knownFacts).toEqual([]) // nothing known yet
    knowledge = { ...knowledge, ventureFamily: 'LOCAL_SERVICES' }

    const group = resolveLearnQuestion(knowledge)
    expect(group.done).toBe(false)
    if (group.done) throw new Error('unreachable')
    expect(group.step.key).toBe('business_group')
    expect(group.step.choices.map((c) => c.value)).toContain('HOME_SERVICES')
    expect(group.knownFacts).toEqual(['Local service']) // cumulative, not a question count
    knowledge = { ...knowledge, businessGroup: 'HOME_SERVICES' }

    const type = resolveLearnQuestion(knowledge)
    expect(type.done).toBe(false)
    if (type.done) throw new Error('unreachable')
    expect(type.step.key).toBe('venture_type')
    expect(type.step.choices.map((c) => c.value)).toContain('ROOFING')
    expect(type.knownFacts).toEqual(['Local service', 'Home services'])
    knowledge = { ...knowledge, ventureType: 'ROOFING' }

    const goal = resolveLearnQuestion(knowledge)
    expect(goal.done).toBe(false)
    if (goal.done) throw new Error('unreachable')
    expect(goal.step.key).toBe('primary_goal')
    expect(goal.knownFacts).toEqual(['Local service', 'Home services', 'Roofing'])
    knowledge = { ...knowledge, primaryGoal: 'GET_MORE_CUSTOMERS' }

    // Qualification questions follow (target_customer first for the local-service playbook).
    const qualification = resolveLearnQuestion(knowledge)
    expect(qualification.done).toBe(false)
    if (qualification.done) throw new Error('unreachable')
    expect(qualification.step.key).toBe('target_customer')
    expect(qualification.knownFacts).toEqual([
      'Local service',
      'Home services',
      'Roofing',
      'Get more customers',
    ])
  })

  it('skips every already-known fact — a fully qualified business resolves straight to done', () => {
    const knowledge: BusinessKnowledge = {
      ventureFamily: 'LOCAL_SERVICES',
      businessGroup: 'HOME_SERVICES',
      ventureType: 'ROOFING',
      primaryGoal: 'GET_MORE_CUSTOMERS',
      targetCustomer: 'HOMEOWNERS',
      serviceArea: 'ONE_CITY',
      customerGoalBand: 'FOUR_TO_TEN',
      weeklyGrowthTimeBand: 'TWO_TO_FIVE',
      marketingBudgetBand: 'ONE_TO_FIVE_HUNDRED',
    }
    const result = resolveLearnQuestion(knowledge)
    expect(result.done).toBe(true)
    if (!result.done) throw new Error('unreachable')
    expect(result.playbookKey).toBe('LOCAL_SERVICE_GET_CUSTOMERS')
    expect(result.knownFacts).toEqual([
      'Local service',
      'Home services',
      'Roofing',
      'Get more customers',
      'Homeowners',
      'Just my city',
      '4–10',
      '2–5 hours',
      '$100–500',
    ])
  })

  it('a goal with no POC playbook resolves done with an empty playbookKey', () => {
    const knowledge: BusinessKnowledge = {
      ventureFamily: 'LOCAL_SERVICES',
      businessGroup: 'HOME_SERVICES',
      ventureType: 'ROOFING',
      primaryGoal: 'MAKE_MORE_SALES',
    }
    const result = resolveLearnQuestion(knowledge)
    expect(result).toMatchObject({ done: true, playbookKey: '' })
  })
})

describe('selectPlaybook — specificity precedence', () => {
  it('exact venture type beats a generic trait match for the same goal', () => {
    const playbook = selectPlaybook('GET_MORE_CUSTOMERS', {
      ventureType: 'WEB_DEVELOPMENT',
      businessGroup: 'DIGITAL_SERVICES',
      traits: ['ONLINE', 'HIGH_TICKET', 'QUOTE_BASED', 'PROJECT_BASED'],
    })
    expect(playbook?.key).toBe('WEB_DEVELOPMENT_GET_CUSTOMERS')
  })

  it('falls back to the trait-matched playbook for a venture with no dedicated playbook', () => {
    const playbook = selectPlaybook('GET_MORE_CUSTOMERS', {
      ventureType: 'PLUMBING',
      businessGroup: 'HOME_SERVICES',
      traits: ['LOCAL', 'QUOTE_BASED'],
    })
    expect(playbook?.key).toBe('LOCAL_SERVICE_GET_CUSTOMERS')
  })

  it('returns undefined for a goal with no matching playbook at all', () => {
    expect(selectPlaybook('IMPROVE_WEBSITE', { traits: [] })).toBeUndefined()
  })

  it('every playbook step references a real GoalIdeaTemplate id (checked against the seed catalog)', async () => {
    const { STATIC_GOAL_IDEA_TEMPLATES, DYNAMIC_GOAL_IDEA_TEMPLATES } = await import('@project/db')
    const allIds = new Set(
      [...STATIC_GOAL_IDEA_TEMPLATES, ...DYNAMIC_GOAL_IDEA_TEMPLATES].map((t) => t.id),
    )
    for (const key of ['LOCAL_SERVICE_GET_CUSTOMERS', 'WEB_DEVELOPMENT_GET_CUSTOMERS']) {
      const playbook = getPlaybook(key)
      expect(playbook).toBeDefined()
      for (const step of playbook!.steps) {
        expect(allIds.has(step.templateId)).toBe(true)
      }
    }
  })
})

describe('phaseEngine', () => {
  it('does not enter Review before the plan is scheduled', () => {
    const { enter } = shouldEnterReview({
      actStartedAt: null,
      totalSteps: 0,
      doneSteps: 0,
      minDaysElapsed: 14,
      minStepsDoneFraction: 0.5,
      hasUrgentSignal: false,
    })
    expect(enter).toBe(false)
  })

  it('enters Review once enough steps are done, even before the time window', () => {
    const { enter, reason } = shouldEnterReview({
      actStartedAt: new Date(),
      totalSteps: 6,
      doneSteps: 4,
      minDaysElapsed: 14,
      minStepsDoneFraction: 0.5,
      hasUrgentSignal: false,
    })
    expect(enter).toBe(true)
    expect(reason).toMatch(/complete/)
  })

  it('an urgent signal forces Review regardless of progress/time', () => {
    const { enter } = shouldEnterReview({
      actStartedAt: new Date(),
      totalSteps: 6,
      doneSteps: 0,
      minDaysElapsed: 14,
      minStepsDoneFraction: 0.5,
      hasUrgentSignal: true,
    })
    expect(enter).toBe(true)
  })

  it('classifies NOT_EXECUTED when time elapsed with zero steps done', () => {
    const outcome = classifyReview({
      doneFraction: 0,
      daysElapsed: 20,
      minDaysElapsed: 14,
      saleRecorded: false,
      interestedLeadsCount: 0,
      hasEnoughEvidence: true,
    })
    expect(outcome).toBe('NOT_EXECUTED')
  })

  it('classifies WORKING when a sale was recorded', () => {
    const outcome = classifyReview({
      doneFraction: 0.6,
      daysElapsed: 10,
      minDaysElapsed: 14,
      saleRecorded: true,
      interestedLeadsCount: 0,
      hasEnoughEvidence: true,
    })
    expect(outcome).toBe('WORKING')
  })

  it('classifies PARTIALLY_WORKING for real interest short of a sale', () => {
    const outcome = classifyReview({
      doneFraction: 0.6,
      daysElapsed: 10,
      minDaysElapsed: 14,
      saleRecorded: false,
      interestedLeadsCount: 2,
      hasEnoughEvidence: true,
    })
    expect(outcome).toBe('PARTIALLY_WORKING')
  })

  it('every review outcome has at least one Grow direction', () => {
    for (const outcome of [
      'WORKING',
      'PARTIALLY_WORKING',
      'NOT_WORKING',
      'NOT_ENOUGH_DATA',
      'NOT_EXECUTED',
    ] as const) {
      expect(growDirectionsFor(outcome).length).toBeGreaterThan(0)
    }
  })
})
