// Assistant goal cycle (Learn -> Act -> Review -> Grow) — the full roofing path end-to-end
// against the real HTTP app + live test DB, plus a shorter web-development traversal proving the
// taxonomy/playbook selection is data-driven, not roofing-specific. See
// docs/loopie-assistant-playbook-poc/05-poc-flow-fixtures.md (fixtures A, E, F, G).
//
// 2026-09-04 operating-system pass: playbooks moved from one flat repeated step list to ordered
// layers, gated by a new universal `teamSize` Learn question; the Roofing path below proves layer
// progression (Grow's "next cycle" pulls the next layer's steps, not a repeat). GET
// /assistant/next-action's response carries two wholly independent slots, `action` (this whole
// goal-cycle/setup-chain/Calendar-fallback resolution, unchanged mechanically) and `conversation`
// (a separate browsable advice corpus — see assistant.test.ts, not exercised in depth here) — this
// suite asserts against `.action` throughout.
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testBusinessId,
  testOtherUserId,
  testOtherBusinessId,
} from './helpers'
import { db } from '@project/db'

const app = buildTestApp()
const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

async function getNextAction(userId: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/assistant/next-action',
    headers: asAuth(userId),
  })
  expect(res.statusCode).toBe(200)
  return res.json().data as { action: any; conversation: any }
}

async function answer(userId: string, questionKey: string, value: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/assistant/goal-cycle/answer',
    headers: asAuth(userId),
    payload: { questionKey, value },
  })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

// Satisfies the Business/Page/Advertising priority chain ahead of the GOAL_CYCLE slot so these
// tests exercise the Assistant's goal-cycle logic, not the already-covered chain above it
// (assistant.test.ts).
async function clearCrossProductChain(userId: string, businessId: string) {
  await app.inject({
    method: 'PATCH',
    url: '/business',
    headers: asAuth(userId),
    payload: {
      industry: 'Roofing',
      location: 'Austin, TX',
      phone: '555-0100',
      email: 'hi@example.com',
      description: 'We do roofing.',
      logoUrl: 'https://example.com/logo.png',
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(userId),
    payload: {
      templateId: HOMEPAGE_TEMPLATE_ID,
      name: 'Homepage',
      slug: `gc-homepage-${businessId}-${Date.now()}`,
    },
  })
  const pageId = pageRes.json().data.id
  await app.inject({
    method: 'POST',
    url: `/landing-pages/${pageId}/publish`,
    headers: asAuth(userId),
  })
  // Grab the real hosted URL the way the client would (via the assistant's own campaign_create
  // suggestion) rather than reconstructing it — PUBLIC_BASE_URL is environment-specific.
  const promoteAction = (await getNextAction(userId)).action
  expect(promoteAction).toMatchObject({ type: 'ADVERTISING', actionId: 'campaign_create' })
  const campaignRes = await app.inject({
    method: 'POST',
    url: '/campaigns',
    headers: asAuth(userId),
    payload: { name: 'Promote homepage', destinationUrl: promoteAction.pageUrl },
  })
  const campaignId = campaignRes.json().data.id
  const creative = await db.creative.create({ data: { businessId, name: 'Homepage ad' } })
  await db.campaignCreative.create({ data: { campaignId, creativeId: creative.id } })
}

describe('assistant goal cycle', () => {
  it('walks the full Roofing path: Learn -> Act -> a sale signal enters Review -> Grow -> the NEXT LAYER (not a repeat)', async () => {
    await clearCrossProductChain(testUserId, testBusinessId)

    // --- LEARN: taxonomy ---
    let action = (await getNextAction(testUserId)).action
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'learn_step' })
    expect(action.cycleId).toBeNull()
    expect(action.step.key).toBe('venture_family')

    action = await answer(testUserId, 'ventureFamily', 'LOCAL_SERVICES')
    expect(action.step).toMatchObject({ key: 'business_group' })

    action = await answer(testUserId, 'businessGroup', 'HOME_SERVICES')
    expect(action.step).toMatchObject({ key: 'venture_type' })
    expect(action.step.choices.map((c: any) => c.value)).toContain('ROOFING')

    action = await answer(testUserId, 'ventureType', 'ROOFING')
    expect(action.step).toMatchObject({ key: 'primary_goal' })

    // Answering primaryGoal creates the AssistantGoalCycle row.
    action = await answer(testUserId, 'primaryGoal', 'GET_MORE_CUSTOMERS')
    expect(action.cycleId).not.toBeNull()
    const cycleId = action.cycleId

    // Team size is asked once, universally, right after the goal — before any playbook-specific
    // qualification question. This business has a small team, so a team-ownership step should
    // appear in its very first plan (Layer 1), not wait for a later "unlock."
    expect(action.step).toMatchObject({ key: 'team_size' })
    action = await answer(testUserId, 'teamSize', 'SMALL_TEAM')

    // --- LEARN: qualification (playbook-specific) ---
    expect(action.step).toMatchObject({ key: 'target_customer' })

    action = await answer(testUserId, 'targetCustomer', 'HOMEOWNERS')
    // serviceArea ("how broadly this business serves customers") is a distinct fact from
    // Business.location ("where it's based", already set above) — it's never pre-skipped by
    // having a location on file, and answering it must never overwrite that location.
    expect(action.step).toMatchObject({ key: 'service_area' })

    action = await answer(testUserId, 'serviceArea', 'ONE_CITY')
    const businessAfterServiceArea = await db.business.findUniqueOrThrow({
      where: { id: testBusinessId },
    })
    expect(businessAfterServiceArea.location).toBe('Austin, TX')
    expect(action.step).toMatchObject({ key: 'customer_goal' })

    action = await answer(testUserId, 'customerGoalBand', 'FOUR_TO_TEN')
    expect(action.step).toMatchObject({ key: 'weekly_time' })

    action = await answer(testUserId, 'weeklyGrowthTimeBand', 'TWO_TO_FIVE')
    expect(action.step).toMatchObject({ key: 'marketing_budget' })

    // --- LEARN done -> Act's plan preview: Layer 1 (Marketing Foundation) only — the
    // occupation-specific Operations layer and the Sales-Process layer's "contact prospects"
    // haven't appeared yet, and won't until this layer is actually completed. ---
    action = await answer(testUserId, 'marketingBudgetBand', 'ONE_TO_FIVE_HUNDRED')
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan', cycleId })
    const layer1Ids = action.plan.map((t: any) => t.templateId)
    expect(layer1Ids).toEqual(
      expect.arrayContaining([
        'system-idea-define-primary-offer',
        'system-idea-publish-homepage',
        'system-idea-first-audience',
        'system-idea-assign-team-owner', // team-gated, appears immediately for SMALL_TEAM
      ]),
    )
    expect(layer1Ids).not.toContain('system-idea-contact-prospects') // that's Layer 2
    expect(action.plan.length).toBe(4)

    // --- Act: schedule the plan onto Calendar ---
    const scheduleRes = await app.inject({
      method: 'POST',
      url: '/assistant/goal-cycle/schedule-plan',
      headers: asAuth(testUserId),
      payload: { cycleId },
    })
    expect(scheduleRes.statusCode).toBe(200)

    const scheduled = await db.scheduledGoal.findMany({ where: { assistantGoalCycleId: cycleId } })
    expect(scheduled.length).toBe(4)
    expect(scheduled.every((g) => g.source === 'ASSISTANT_PLAYBOOK')).toBe(true)
    const cycleAfterSchedule = await db.assistantGoalCycle.findUniqueOrThrow({
      where: { id: cycleId },
    })
    expect(cycleAfterSchedule.phase).toBe('ACT')
    expect(cycleAfterSchedule.actStartedAt).not.toBeNull()
    expect(cycleAfterSchedule.layerKey).toBe('OFFER_AND_FOUNDATION')

    // Nothing due for review yet, no signal -> the goal-cycle slot has nothing to show, and the
    // setup chain is already clear -> action falls all the way through to Calendar.
    let next = await getNextAction(testUserId)
    expect(next.action.type).toBe('CALENDAR')

    // --- A sale is recorded during the cycle (fixture E) -> signal + auto-advance to Review/Grow ---
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Jamie Homeowner' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        stage: 'CLOSED',
        sourceType: 'MANUAL',
        openSlot: null,
        closedAt: new Date(),
      },
    })
    await db.sale.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        leadId: lead.id,
        amount: 4200,
        date: new Date(),
        productOrService: 'Roof replacement',
        sourceType: 'MANUAL',
      },
    })

    next = await getNextAction(testUserId)
    action = next.action
    expect(action).toMatchObject({ type: 'SIGNAL', actionId: 'sale_recorded', cycleId })
    expect(action.signalSummary.headline).toBe('You made a sale.')

    const cycleAfterSale = await db.assistantGoalCycle.findUniqueOrThrow({ where: { id: cycleId } })
    expect(cycleAfterSale.phase).toBe('GROW')
    expect(cycleAfterSale.reviewOutcome).toBe('WORKING')

    // --- Grow: the next read (signal already shown once) presents the Grow directions ---
    action = (await getNextAction(testUserId)).action
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'grow', cycleId })
    expect(action.growSummary.directions.map((d: any) => d.value)).toContain('DO_MORE')

    // --- Choosing "Do more of this" completes this cycle and starts the next Act cycle without
    // repeating any Learn question (fixture F) — AND advances to Layer 2 (Sales Process) instead
    // of repeating Layer 1's steps. This is the actual fix for "trite and small, repeated every
    // cycle": Grow means the operating system gets richer, not that the same checklist recurs. ---
    const growRes = await app.inject({
      method: 'POST',
      url: '/assistant/goal-cycle/grow',
      headers: asAuth(testUserId),
      payload: { cycleId, direction: 'DO_MORE' },
    })
    expect(growRes.statusCode).toBe(200)
    const nextAction = growRes.json().data
    expect(nextAction).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan' })
    expect(nextAction.cycleId).not.toBe(cycleId)
    const layer2Ids = nextAction.plan.map((t: any) => t.templateId)
    expect(layer2Ids).toEqual(
      expect.arrayContaining([
        'system-idea-callback-window',
        'system-idea-quoting-script',
        'system-idea-contact-prospects',
        'system-idea-leads-flagged-for-follow-up',
      ]),
    )
    expect(layer2Ids).not.toContain('system-idea-define-primary-offer') // Layer 1 is done, not repeated
    const contactStep = nextAction.plan.find(
      (t: any) => t.templateId === 'system-idea-contact-prospects',
    )
    expect(contactStep.title).toBe('Contact 10 prospects') // FOUR_TO_TEN -> 10

    const completedCycle = await db.assistantGoalCycle.findUniqueOrThrow({ where: { id: cycleId } })
    expect(completedCycle.status).toBe('COMPLETED')
    const newCycle = await db.assistantGoalCycle.findUniqueOrThrow({
      where: { id: nextAction.cycleId },
    })
    expect(newCycle.layerKey).toBe('LEAD_AND_SALES_PROCESS')
  })

  it('a materially different business (Web Development) resolves its own playbook and qualification questions', async () => {
    await clearCrossProductChain(testOtherUserId, testOtherBusinessId)

    let action = await answer(testOtherUserId, 'ventureFamily', 'PROFESSIONAL_SERVICES')
    expect(action.step).toMatchObject({ key: 'business_group' })

    action = await answer(testOtherUserId, 'businessGroup', 'DIGITAL_SERVICES')
    expect(action.step.choices.map((c: any) => c.value)).toContain('WEB_DEVELOPMENT')

    action = await answer(testOtherUserId, 'ventureType', 'WEB_DEVELOPMENT')
    action = await answer(testOtherUserId, 'primaryGoal', 'GET_MORE_CUSTOMERS')
    const cycleId = action.cycleId

    expect(action.step).toMatchObject({ key: 'team_size' })
    action = await answer(testOtherUserId, 'teamSize', 'SOLO')

    // Web development's own first qualification question — different choices than roofing's.
    expect(action.step.key).toBe('target_customer')
    expect(action.step.choices.map((c: any) => c.value)).toEqual([
      'INDIVIDUALS',
      'SMALL_BUSINESSES',
      'STARTUPS',
      'ENTERPRISES',
    ])

    action = await answer(testOtherUserId, 'targetCustomer', 'SMALL_BUSINESSES')
    expect(action.step).toMatchObject({ key: 'primary_offer' })
    action = await answer(testOtherUserId, 'primaryOffer', 'WEB_APPS')
    action = await answer(testOtherUserId, 'customerGoalBand', 'ONE_TO_THREE')
    action = await answer(testOtherUserId, 'weeklyGrowthTimeBand', 'FIVE_PLUS')

    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan', cycleId })
    // Layer 1 shares its underlying templates with the roofing playbook's Layer 1 (proving reuse
    // across verticals, not a second task universe) even though the visible title for the
    // homepage step is overridden per vertical; SOLO means no team-ownership step here.
    const ids = action.plan.map((t: any) => t.templateId)
    expect(ids).toEqual(
      expect.arrayContaining([
        'system-idea-define-primary-offer',
        'system-idea-publish-homepage',
        'system-idea-first-audience',
      ]),
    )
    expect(ids).not.toContain('system-idea-assign-team-owner') // SOLO — filtered out
    expect(action.plan.length).toBe(3)
    const homepage = action.plan.find((t: any) => t.templateId === 'system-idea-publish-homepage')
    expect(homepage.title).toBe('Launch your portfolio homepage')
  })
})
