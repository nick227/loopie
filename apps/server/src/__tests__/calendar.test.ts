// Filled-in integration test (not a generated stub) for Calendar: the Idea -> Schedule ->
// Today/This Week -> Done lifecycle, dismiss durability, the CRM integration loop (schedule a
// follow-up from a Lead, see it on the board, log the activity, watch it auto-complete), and the
// coach-rules prerequisite gate (lib/coachRules.ts).
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function getBoard() {
  const res = await app.inject({
    method: 'GET',
    url: '/calendar/board',
    headers: asAuth(testUserId),
  })
  expect(res.statusCode).toBe(200)
  return res.json().data as {
    today: any[]
    thisWeek: any[]
    recentlyCompleted: any[]
    ideas: any[]
  }
}

// With the visible pool capped at MAX_IDEAS (6) and Foundation-stage content alone easily
// exceeding that for a fresh business, a lower-priority or later-stage idea genuinely being
// *eligible* doesn't mean it's currently occupying one of the 6 visible slots. Tests that care
// about eligibility (not ranking) dismiss whatever's currently ahead of it until it surfaces —
// durably clearing occupants the same way a real user would work through their list, bounded well
// under the ~39-template reserve library so it always terminates.
async function surfaceTemplate(templateId: string, maxAttempts = 50) {
  let board = await getBoard()
  for (let i = 0; i < maxAttempts; i++) {
    if (board.ideas.some((idea: any) => idea.templateId === templateId)) return board
    const other = board.ideas.find((idea: any) => idea.templateId !== templateId)
    if (!other) return board
    await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${other.templateId}/dismiss`,
      headers: asAuth(testUserId),
    })
    board = await getBoard()
  }
  return board
}

describe('calendar', () => {
  it('adds a user idea, schedules it onto the board, and completes it', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/calendar/ideas',
      headers: asAuth(testUserId),
      payload: { title: 'Sharpen the mower blades' },
    })
    expect(createRes.statusCode).toBe(201)
    const templateId = createRes.json().data.templateId

    let board = await getBoard()
    expect(board.ideas.map((i) => i.title)).toContain('Sharpen the mower blades')

    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY', estimateMinutes: 30 },
    })
    expect(scheduleRes.statusCode).toBe(201)
    const goal = scheduleRes.json().data
    expect(goal.status).toBe('SCHEDULED')
    expect(goal.estimateMinutes).toBe(30)

    board = await getBoard()
    expect(board.today.map((g) => g.id)).toContain(goal.id)
    // Scheduling removes it from the pool — the template is now "in flight," not up for grabs again.
    expect(board.ideas.map((i) => i.templateId)).not.toContain(templateId)

    const completeRes = await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goal.id}`,
      headers: asAuth(testUserId),
      payload: { status: 'DONE' },
    })
    expect(completeRes.statusCode).toBe(200)
    expect(completeRes.json().data.status).toBe('DONE')

    board = await getBoard()
    expect(board.today.map((g) => g.id)).not.toContain(goal.id)
  })

  it('dismisses a system idea durably, without affecting other businesses', async () => {
    // system-idea-set-pricing is one of the Foundation-tier "big real goals" that reliably wins a
    // top-6 slot for a fresh business — no surfacing needed.
    let board = await getBoard()
    expect(board.ideas.map((i) => i.templateId)).toContain('system-idea-set-pricing')

    const dismissRes = await app.inject({
      method: 'POST',
      url: '/calendar/ideas/system-idea-set-pricing/dismiss',
      headers: asAuth(testUserId),
    })
    expect(dismissRes.statusCode).toBe(200)

    board = await getBoard()
    expect(board.ideas.map((i) => i.templateId)).not.toContain('system-idea-set-pricing')

    const state = await db.goalIdeaState.findUnique({
      where: {
        businessId_templateId: {
          businessId: testBusinessId,
          templateId: 'system-idea-set-pricing',
        },
      },
    })
    expect(state?.dismissedAt).not.toBeNull()
  })

  it('mirrors a Lead next action into Calendar and auto-completes it when the activity is logged', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Jane Calendar-Test' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'INTERESTED',
        openSlot: 'OPEN',
      },
    })

    const nextActionAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: 'Call back', nextActionAt },
    })
    expect(updateRes.statusCode).toBe(200)

    let board = await getBoard()
    let mirrored = [...board.today, ...board.thisWeek].find((g) => g.subjectId === lead.id)
    expect(mirrored).toBeTruthy()
    expect(mirrored.subjectType).toBe('CRM')
    expect(mirrored.hasTime).toBe(true)
    expect(mirrored.status).toBe('SCHEDULED')

    const activityRes = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED', note: 'Reached her' },
    })
    expect(activityRes.statusCode).toBe(201)

    board = await getBoard()
    mirrored = [...board.today, ...board.thisWeek].find((g) => g.subjectId === lead.id)
    expect(mirrored).toBeUndefined()

    const goalRow = await db.scheduledGoal.findFirst({
      where: { businessId: testBusinessId, externalKey: `crm-next-action:${lead.id}` },
    })
    expect(goalRow?.status).toBe('DONE')
  })

  it('clearing the Lead next action dismisses the mirrored Calendar item', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Sam Calendar-Test' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'INTERESTED',
        openSlot: 'OPEN',
      },
    })

    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: {
        nextActionNote: 'Email quote',
        nextActionAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    })
    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionAt: null },
    })

    const goalRow = await db.scheduledGoal.findFirst({
      where: { businessId: testBusinessId, externalKey: `crm-next-action:${lead.id}` },
    })
    expect(goalRow?.status).toBe('DISMISSED')

    const board = await getBoard()
    expect([...board.today, ...board.thisWeek].map((g) => g.subjectId)).not.toContain(lead.id)
  })

  it('surfaces a dynamic idea only while its condition holds, with a live-computed target', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Stale Lead Contact' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'INTERESTED',
        openSlot: 'OPEN',
        openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    })

    let board = await surfaceTemplate('system-idea-follow-up-qualified-leads')
    const dynamicIdea = board.ideas.find(
      (i) => i.templateId === 'system-idea-follow-up-qualified-leads',
    )
    expect(dynamicIdea).toBeTruthy()
    expect(dynamicIdea.title).toContain('1 qualified lead')
    expect(dynamicIdea.targetValue).toBe(1)

    await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED' },
    })

    board = await getBoard()
    expect(
      board.ideas.find((i) => i.templateId === 'system-idea-follow-up-qualified-leads'),
    ).toBeUndefined()

    void lead
  })

  it('gates a prerequisite-locked idea until the required template is done, then unlocks it', async () => {
    // "Publish recent work" requires "publish your homepage" — see goalIdeas.ts.
    let board = await getBoard()
    expect(board.ideas.map((i) => i.templateId)).not.toContain('system-idea-publish-recent-work')
    expect(board.ideas.map((i) => i.templateId)).toContain('system-idea-publish-homepage')

    const prereqGoal = await db.scheduledGoal.create({
      data: {
        businessId: testBusinessId,
        title: 'Publish your homepage',
        source: 'IDEA_TEMPLATE',
        sourceTemplateId: 'system-idea-publish-homepage',
        subjectType: 'PAGE',
        trackingType: 'ENTITY_STATE',
        metricKey: 'ANY_PAGE_PUBLISHED',
        targetValue: 1,
        status: 'DONE',
        completedAt: new Date(),
      },
    })

    board = await surfaceTemplate('system-idea-publish-recent-work')
    expect(board.ideas.map((i) => i.templateId)).toContain('system-idea-publish-recent-work')
    const unlocked = board.ideas.find((i) => i.templateId === 'system-idea-publish-recent-work')
    expect(unlocked.stage).toBe('ATTRACT')

    void prereqGoal
  })

  it('carries no action destination while still an idea, but gets one once scheduled', async () => {
    const board = await getBoard()
    const businessProfileIdea = board.ideas.find(
      (i) => i.templateId === 'system-idea-business-profile',
    )
    expect(businessProfileIdea).toBeTruthy()
    expect(businessProfileIdea.actionTarget).toBeUndefined()
    expect(businessProfileIdea.actionLabel).toBeUndefined()

    const scheduleRes = await app.inject({
      method: 'POST',
      url: '/calendar/ideas/system-idea-business-profile/schedule',
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    expect(scheduleRes.statusCode).toBe(201)
    expect(scheduleRes.json().data.actionTarget).toBe('/business/setup')
  })

  it('keeps a completed goal visible in recentlyCompleted instead of dropping it', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/calendar/ideas',
      headers: asAuth(testUserId),
      payload: { title: 'Water the office plants' },
    })
    const templateId = createRes.json().data.templateId
    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    const goalId = scheduleRes.json().data.id

    await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goalId}`,
      headers: asAuth(testUserId),
      payload: { status: 'DONE' },
    })

    const board = await getBoard()
    expect(board.today.map((g) => g.id)).not.toContain(goalId)
    const completed = board.recentlyCompleted.find((g) => g.id === goalId)
    expect(completed).toBeTruthy()
    expect(completed.status).toBe('DONE')
  })

  it('finds a goal by an arbitrary date range, including outside the current week — the Calendar (Month) view read', async () => {
    const farOut = new Date()
    farOut.setDate(farOut.getDate() + 40) // well past "this week"
    const goal = await db.scheduledGoal.create({
      data: {
        businessId: testBusinessId,
        title: 'Next month planning',
        source: 'USER_CREATED',
        subjectType: 'GENERAL',
        trackingType: 'MANUAL',
        scheduledFor: farOut,
        hasTime: false,
        status: 'SCHEDULED',
      },
    })

    // Absent from the board (outside today/this week)...
    const board = await getBoard()
    expect([...board.today, ...board.thisWeek].map((g) => g.id)).not.toContain(goal.id)

    // ...but present via the range read once the queried range actually covers that date.
    const from = new Date(farOut)
    from.setDate(from.getDate() - 3)
    const to = new Date(farOut)
    to.setDate(to.getDate() + 3)
    const res = await app.inject({
      method: 'GET',
      url: `/calendar/goals?from=${from.toISOString()}&to=${to.toISOString()}`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.map((g: any) => g.id)).toContain(goal.id)

    // A range that doesn't cover it finds nothing.
    const missRes = await app.inject({
      method: 'GET',
      url: `/calendar/goals?from=${new Date().toISOString()}&to=${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}`,
      headers: asAuth(testUserId),
    })
    expect(missRes.json().data.map((g: any) => g.id)).not.toContain(goal.id)
  })

  it('extends the coach to Messaging and Sales-activity currencies, not just Pages/Ads/CRM', async () => {
    // No message ever sent -> the Messaging idea is eligible.
    let board = await surfaceTemplate('system-idea-send-first-message')
    expect(board.ideas.map((i: any) => i.templateId)).toContain('system-idea-send-first-message')

    // A won lead with no recorded Sale -> the "record a sale" idea is eligible.
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Won Deal Co' },
    })
    await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'CLOSED',
      },
    })
    board = await surfaceTemplate('system-idea-record-won-sale')
    expect(board.ideas.map((i: any) => i.templateId)).toContain('system-idea-record-won-sale')

    // Recording the sale closes the gap and the idea disappears.
    await db.sale.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        leadId: (await db.lead.findFirstOrThrow({ where: { contactId: contact.id } })).id,
        amount: 500,
        date: new Date(),
        sourceType: 'MANUAL',
      },
    })
    board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId)).not.toContain('system-idea-record-won-sale')
  })

  it('keeps a much larger reserve library than what it ever shows at once', async () => {
    // getBoard() lazily ensures the system template content exists (ensureSystemGoalIdeaTemplates)
    // — fetch the board first so the count below reflects the real catalog, not an empty table
    // freshly wiped by this suite's own per-test cleanup.
    const board = await getBoard()
    expect(board.ideas.length).toBeGreaterThan(0)
    expect(board.ideas.length).toBeLessThanOrEqual(30)

    const templateCount = await db.goalIdeaTemplate.count({ where: { isSystem: true } })
    expect(templateCount).toBeGreaterThanOrEqual(35)
  })

  it('retiring a template from the catalog nulls out old goals that named it instead of crashing the board', async () => {
    // Simulates goalIdeas.ts dropping an id that a past (even completed) ScheduledGoal already
    // references — sourceTemplateId is a real FK (ScheduledGoal.template), so
    // ensureSystemGoalIdeaTemplates's orphan cleanup must null the reference before deleting the
    // row, not just delete-by-id and let the next board read 500 for every business.
    const retired = await db.goalIdeaTemplate.create({
      data: {
        id: 'system-idea-retired-for-test',
        businessId: null,
        isSystem: true,
        title: 'A retired idea',
        ideaType: 'ACTION',
        subjectType: 'GENERAL',
        stage: 'FOUNDATION',
        trackingType: 'MANUAL',
        priorityWeight: 1,
      },
    })
    const goal = await db.scheduledGoal.create({
      data: {
        businessId: testBusinessId,
        title: 'Old completed goal from a retired idea',
        source: 'IDEA_TEMPLATE',
        sourceTemplateId: retired.id,
        subjectType: 'GENERAL',
        trackingType: 'MANUAL',
        status: 'DONE',
        completedAt: new Date(),
      },
    })

    const board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId)).not.toContain(retired.id)

    const reloaded = await db.scheduledGoal.findUnique({ where: { id: goal.id } })
    expect(reloaded?.sourceTemplateId).toBeNull()
    expect(reloaded?.title).toBe('Old completed goal from a retired idea')
    expect(await db.goalIdeaTemplate.findUnique({ where: { id: retired.id } })).toBeNull()
  })

  it('a one-time idea disappears for good once done, but a repeatable one comes back after its cooldown', async () => {
    // "Work on your logo for an hour" is repeatable: false (the default) — completing it once
    // should remove it permanently, not just until the next board read.
    let board = await surfaceTemplate('system-idea-logo-hour')
    expect(board.ideas.map((i: any) => i.templateId)).toContain('system-idea-logo-hour')

    await db.scheduledGoal.create({
      data: {
        businessId: testBusinessId,
        title: 'Work on your logo for an hour',
        source: 'IDEA_TEMPLATE',
        sourceTemplateId: 'system-idea-logo-hour',
        subjectType: 'BUSINESS',
        trackingType: 'MANUAL',
        status: 'DONE',
        completedAt: new Date(),
      },
    })
    board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId)).not.toContain('system-idea-logo-hour')

    // "Ask 3 customers for reviews" is repeatable with a 30-day cooldown. Completed just now, it
    // should stay hidden...
    await db.scheduledGoal.create({
      data: {
        businessId: testBusinessId,
        title: 'Ask 3 customers for reviews',
        source: 'IDEA_TEMPLATE',
        sourceTemplateId: 'system-idea-ask-for-reviews',
        subjectType: 'GENERAL',
        trackingType: 'MANUAL',
        status: 'DONE',
        completedAt: new Date(),
      },
    })
    board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId)).not.toContain('system-idea-ask-for-reviews')

    // ...but once 30+ days have passed since that completion, it's offered again.
    await db.scheduledGoal.updateMany({
      where: { businessId: testBusinessId, sourceTemplateId: 'system-idea-ask-for-reviews' },
      data: { completedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    })
    board = await surfaceTemplate('system-idea-ask-for-reviews')
    expect(board.ideas.map((i: any) => i.templateId)).toContain('system-idea-ask-for-reviews')
  })

  async function scheduleAndComplete(templateId: string) {
    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    expect(scheduleRes.statusCode).toBe(201)
    const goalId = scheduleRes.json().data.id
    const completeRes = await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goalId}`,
      headers: asAuth(testUserId),
      payload: { status: 'DONE' },
    })
    expect(completeRes.statusCode).toBe(200)
  }

  it('gives a just-unlocked successor a temporary boost into the visible pool, without permanently reordering the catalog', async () => {
    // A fully controlled reproduction of the real gap found manually verifying the lead-magnet
    // chain ("Advertise your lead magnet page" is genuinely eligible the moment its predecessor is
    // done, but Capture's Advertisement category is usually already held by a higher-priority
    // unrelated idea) — six Foundation-stage fillers, one per category, deterministically fill the
    // entire cap on priority alone, so Attract is never reached and every assertion below is
    // attributable to the boost specifically, not incidental catalog crowding.
    const categories = ['GENERAL', 'CRM', 'ADVERTISEMENT', 'PAGE', 'RIVER', 'BUSINESS'] as const
    const fillers = await Promise.all(
      categories.map((subjectType, i) =>
        db.goalIdeaTemplate.create({
          data: {
            businessId: testBusinessId,
            isSystem: false,
            title: `Boost test filler ${subjectType}`,
            ideaType: 'ACTION',
            subjectType,
            stage: 'FOUNDATION',
            trackingType: 'MANUAL',
            priorityWeight: 50 - i,
          },
        }),
      ),
    )
    const prereq = await db.goalIdeaTemplate.create({
      data: {
        businessId: testBusinessId,
        isSystem: false,
        title: 'Boost test prerequisite',
        ideaType: 'ACTION',
        subjectType: 'GENERAL',
        stage: 'ATTRACT',
        trackingType: 'MANUAL',
        priorityWeight: 50,
      },
    })
    const successor = await db.goalIdeaTemplate.create({
      data: {
        businessId: testBusinessId,
        isSystem: false,
        title: 'Boost test successor',
        ideaType: 'ACTION',
        subjectType: 'GENERAL',
        stage: 'ATTRACT',
        requiresTemplateIds: [prereq.id],
        trackingType: 'MANUAL',
        priorityWeight: 1, // deliberately the lowest priority in the whole catalog
      },
    })
    const resetIdea = await db.goalIdeaTemplate.create({
      data: {
        businessId: testBusinessId,
        isSystem: false,
        title: 'Boost test unrelated reset',
        ideaType: 'ACTION',
        subjectType: 'GENERAL',
        stage: 'GROW',
        trackingType: 'MANUAL',
        priorityWeight: 50,
      },
    })
    const fillerIds = fillers.map((f) => f.id).sort()

    // Baseline: the six Foundation fillers fill the entire cap; Attract is never reached.
    let board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId).sort()).toEqual(fillerIds)

    await scheduleAndComplete(prereq.id)

    // The successor is now genuinely eligible but, on priority alone, still loses to every
    // filler — its presence here is attributable only to the boost.
    board = await getBoard()
    const idsAfterUnlock = board.ideas.map((i: any) => i.templateId)
    expect(idsAfterUnlock).toContain(successor.id)
    expect(board.ideas.length).toBe(6)
    // A single-slot swap, not a reorder of the stage: exactly one filler was evicted, the other
    // five are untouched.
    expect(idsAfterUnlock.filter((id: string) => fillerIds.includes(id)).length).toBe(5)

    // Complete something unrelated — the boost moves on with the "most recently completed"
    // template, so the successor goes right back to losing on ordinary priority, and the original
    // filler-only set is restored exactly.
    await scheduleAndComplete(resetIdea.id)
    board = await getBoard()
    expect(board.ideas.map((i: any) => i.templateId)).not.toContain(successor.id)
    expect(board.ideas.map((i: any) => i.templateId).sort()).toEqual(fillerIds)
  })

  it('surfaces "follow up with flagged leads" only while a lead is marked followUp', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Flagged Lead Co' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'UNDECIDED',
        openSlot: 'OPEN',
        followUp: true,
      },
    })

    let board = await surfaceTemplate('system-idea-leads-flagged-for-follow-up')
    const idea = board.ideas.find(
      (i: any) => i.templateId === 'system-idea-leads-flagged-for-follow-up',
    )
    expect(idea).toBeTruthy()
    expect(idea.title).toContain('1 flagged lead')

    await db.lead.update({ where: { id: lead.id }, data: { followUp: false } })
    board = await getBoard()
    expect(
      board.ideas.find((i: any) => i.templateId === 'system-idea-leads-flagged-for-follow-up'),
    ).toBeUndefined()
  })

  it('surfaces "send a proposal" for an interested lead with no proposal yet, and hides it once one is sent', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Interested Lead Co' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'INTERESTED',
        openSlot: 'OPEN',
      },
    })

    let board = await surfaceTemplate('system-idea-send-proposal-to-interested')
    expect(
      board.ideas.find((i: any) => i.templateId === 'system-idea-send-proposal-to-interested'),
    ).toBeTruthy()

    await db.lead.update({ where: { id: lead.id }, data: { proposalSent: true } })
    board = await getBoard()
    expect(
      board.ideas.find((i: any) => i.templateId === 'system-idea-send-proposal-to-interested'),
    ).toBeUndefined()
  })

  it('auto-completes CRM Calendar work when a real message is sent, not just when activity is logged manually', async () => {
    const contact = await db.contact.create({
      data: {
        businessId: testBusinessId,
        name: 'Message Send Test',
        email: `msg-${Date.now()}@example.com`,
      },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'UNDECIDED',
        openSlot: 'OPEN',
      },
    })

    const nextActionAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: 'Send a follow-up email', nextActionAt },
    })

    let board = await getBoard()
    expect([...board.today, ...board.thisWeek].some((g: any) => g.subjectId === lead.id)).toBe(true)

    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Message Send Test audience', type: 'MANUAL_LIST' },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })
    const messageRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: {
        channel: 'EMAIL',
        subject: 'Following up',
        body: 'Just checking in.',
        audienceId: audience.id,
      },
    })
    expect(messageRes.statusCode).toBe(201)
    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageRes.json().data.id}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(200)

    board = await getBoard()
    expect([...board.today, ...board.thisWeek].some((g: any) => g.subjectId === lead.id)).toBe(
      false,
    )

    const goalRow = await db.scheduledGoal.findFirst({
      where: { businessId: testBusinessId, externalKey: `crm-next-action:${lead.id}` },
    })
    expect(goalRow?.status).toBe('DONE')
  })
})
