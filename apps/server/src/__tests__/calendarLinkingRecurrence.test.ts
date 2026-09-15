// Filled-in integration test for the Calendar connective-tissue pass (2026-09-15): task linking
// (subjectType/subjectId frozen into actionType/actionTarget/actionLabel, tenant-scoped, the
// link-candidates search) and recurrence (RecurringGoalService's "at most one future instance"
// poller, not completion-triggered — see ScheduledGoal.recurrenceRule's own schema comment).
import { describe, it, expect } from 'vitest'
import { SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID } from '@project/db'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { runDueRecurringGoals } from '../services/RecurringGoalService'

const app = buildTestApp()

async function createScheduledTask(title: string, scheduledFor?: Date) {
  const createRes = await app.inject({
    method: 'POST',
    url: '/calendar/ideas',
    headers: asAuth(testUserId),
    payload: { title },
  })
  expect(createRes.statusCode).toBe(201)
  const templateId = createRes.json().data.templateId
  const scheduleRes = await app.inject({
    method: 'POST',
    url: `/calendar/ideas/${templateId}/schedule`,
    headers: asAuth(testUserId),
    payload: scheduledFor ? { when: 'DATE', date: scheduledFor.toISOString() } : { when: 'TODAY' },
  })
  expect(scheduleRes.statusCode).toBe(201)
  return scheduleRes.json().data as { id: string; scheduledFor: string }
}

async function patchGoal(goalId: string, payload: Record<string, unknown>) {
  const res = await app.inject({
    method: 'PATCH',
    url: `/calendar/goals/${goalId}`,
    headers: asAuth(testUserId),
    payload,
  })
  return res
}

async function createPage(userId: string, name: string) {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
  const res = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(userId),
    payload: { templateId: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID, name, slug },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data as { id: string; name: string }
}

describe('calendar task linking', () => {
  it('links a task to a real Page/Advertisement/Message/Contact, freezing actionTarget/actionLabel, and the link search finds each', async () => {
    const page = await createPage(testUserId, `Fall Launch ${Date.now()}`)
    const ad = await db.advertisement.create({
      data: { businessId: testBusinessId, name: `Fall Prospecting ${Date.now()}` },
    })
    const audience = await db.audience.create({
      data: {
        businessId: testBusinessId,
        name: `Link test audience ${Date.now()}`,
        type: 'MANUAL_LIST',
      },
    })
    const contact = await db.contact.create({
      data: {
        businessId: testBusinessId,
        name: `Link Test Contact ${Date.now()}`,
        email: `link-${Date.now()}@example.com`,
      },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })
    const message = await db.message.create({
      data: {
        businessId: testBusinessId,
        channel: 'EMAIL',
        subject: `Sept sendout ${Date.now()}`,
        body: 'Hello',
        audienceId: audience.id,
      },
    })

    const task = await createScheduledTask('Finalize landing page')

    const cases: { subjectType: string; subjectId: string; path: string; label: string }[] = [
      {
        subjectType: 'PAGE',
        subjectId: page.id,
        path: `/landing-pages/${page.id}`,
        label: page.name,
      },
      { subjectType: 'ADVERTISEMENT', subjectId: ad.id, path: `/ads/${ad.id}`, label: ad.name },
      {
        subjectType: 'MESSAGE',
        subjectId: message.id,
        path: `/messages/${message.id}`,
        label: message.subject!,
      },
      {
        subjectType: 'CRM',
        subjectId: contact.id,
        path: `/contacts/${contact.id}`,
        label: contact.name,
      },
    ]

    for (const c of cases) {
      const res = await patchGoal(task.id, { subjectType: c.subjectType, subjectId: c.subjectId })
      expect(res.statusCode).toBe(200)
      const body = res.json().data
      expect(body.subjectType).toBe(c.subjectType)
      expect(body.subjectId).toBe(c.subjectId)
      expect(body.actionType).toBe('NAVIGATE')
      expect(body.actionTarget).toBe(c.path)
      expect(body.actionLabel).toBe(c.label)

      const searchRes = await app.inject({
        method: 'GET',
        url: `/calendar/link-candidates?subjectType=${c.subjectType}&q=${encodeURIComponent(c.label.slice(0, 6))}`,
        headers: asAuth(testUserId),
      })
      expect(searchRes.statusCode).toBe(200)
      expect(searchRes.json().data.map((r: any) => r.id)).toContain(c.subjectId)
    }

    // Clearing removes the link and the frozen action together.
    const cleared = await patchGoal(task.id, { subjectType: null, subjectId: null })
    expect(cleared.statusCode).toBe(200)
    expect(cleared.json().data.subjectId).toBeNull()
    expect(cleared.json().data.actionTarget).toBeNull()
    expect(cleared.json().data.actionLabel).toBeNull()
  })

  it("refuses to link a task to another business's record", async () => {
    const otherPage = await createPage(testOtherUserId, `Other Business Page ${Date.now()}`)
    const task = await createScheduledTask('Cross-tenant link attempt')
    const res = await patchGoal(task.id, { subjectType: 'PAGE', subjectId: otherPage.id })
    expect(res.statusCode).toBe(404)
  })

  it("moves title/notes/status(DISMISSED) through the rail's update path", async () => {
    const task = await createScheduledTask('Draft title')
    const renamed = await patchGoal(task.id, {
      title: 'Finalize landing page for fall',
      notes: 'Waiting on final photos',
    })
    expect(renamed.statusCode).toBe(200)
    expect(renamed.json().data.title).toBe('Finalize landing page for fall')
    expect(renamed.json().data.notes).toBe('Waiting on final photos')

    const dismissed = await patchGoal(task.id, { status: 'DISMISSED' })
    expect(dismissed.statusCode).toBe(200)
    expect(dismissed.json().data.status).toBe('DISMISSED')

    const event = await db.goalEvent.findFirst({ where: { goalId: task.id, type: 'DISMISSED' } })
    expect(event).not.toBeNull()
  })

  // CRM linkage is unambiguous by construction: listLinkCandidates/_resolveSubjectLink for
  // subjectType='CRM' only ever query db.contact, never db.lead — so a manually-set CRM link can
  // never be a Lead id. The one place a Lead id legitimately lives in subjectId is the pre-
  // existing, separate CRM_NEXT_ACTION mirror (LeadService.upsertCrmNextActionGoal) — this proves
  // that mirror's own linkage survives an unrelated rail edit (the `linkChanged` guard in
  // EditTaskRail, mirrored here by simply never sending subjectType/subjectId).
  it("preserves a CRM_NEXT_ACTION mirror's Lead-based subjectId through an unrelated edit, keeping auto-completion intact", async () => {
    const contact = await db.contact.create({
      data: {
        businessId: testBusinessId,
        name: `CRM Mirror Test ${Date.now()}`,
        email: `crm-${Date.now()}@example.com`,
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
    const nextActionAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const leadPatch = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: 'Follow up', nextActionAt },
    })
    expect(leadPatch.statusCode).toBe(200)

    const mirrored = await db.scheduledGoal.findFirst({
      where: { businessId: testBusinessId, externalKey: `crm-next-action:${lead.id}` },
    })
    expect(mirrored).not.toBeNull()
    expect(mirrored!.subjectType).toBe('CRM')
    expect(mirrored!.subjectId).toBe(lead.id) // a Lead id — the mirror's own long-standing convention

    // An unrelated edit (no subjectType/subjectId in the payload at all) must never touch this.
    const unrelated = await patchGoal(mirrored!.id, { notes: 'Left a voicemail' })
    expect(unrelated.statusCode).toBe(200)
    const afterUnrelated = await db.scheduledGoal.findUnique({ where: { id: mirrored!.id } })
    expect(afterUnrelated!.subjectId).toBe(lead.id)

    // Auto-completion still works — the real proof the linkage genuinely survived, not just the
    // stored id.
    const logRes = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED' },
    })
    expect(logRes.statusCode).toBe(201)
    const afterActivity = await db.scheduledGoal.findUnique({ where: { id: mirrored!.id } })
    expect(afterActivity!.status).toBe('DONE')
  })

  it('changing the linked type replaces the old subjectId atomically, with no leftover cross-type state', async () => {
    const page = await createPage(testUserId, `Retarget Page ${Date.now()}`)
    const contact = await db.contact.create({
      data: {
        businessId: testBusinessId,
        name: `Retype Contact ${Date.now()}`,
        email: `retype-${Date.now()}@example.com`,
      },
    })
    const task = await createScheduledTask('Task to retype')

    const first = await patchGoal(task.id, { subjectType: 'PAGE', subjectId: page.id })
    expect(first.statusCode).toBe(200)
    expect(first.json().data.subjectType).toBe('PAGE')

    const retyped = await patchGoal(task.id, { subjectType: 'CRM', subjectId: contact.id })
    expect(retyped.statusCode).toBe(200)
    const body = retyped.json().data
    expect(body.subjectType).toBe('CRM')
    expect(body.subjectId).toBe(contact.id)
    expect(body.subjectId).not.toBe(page.id)
    expect(body.actionTarget).toBe(`/contacts/${contact.id}`)
    expect(body.actionLabel).toBe(contact.name)
  })

  it('degrades cleanly once a linked Page is deleted: unrelated edits still save, re-setting the same dead link 404s', async () => {
    const page = await createPage(testUserId, `Soon Deleted ${Date.now()}`)
    const task = await createScheduledTask('Task linking to a page that will be deleted')
    const linked = await patchGoal(task.id, { subjectType: 'PAGE', subjectId: page.id })
    expect(linked.statusCode).toBe(200)

    const del = await app.inject({
      method: 'DELETE',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
    })
    expect(del.statusCode).toBe(200)

    // An unrelated field edit — must succeed without re-validating the now-dangling link. This is
    // exactly what makes editing survivable: the row's own frozen actionTarget/actionLabel stay
    // exactly as they were (a stale deep link, same as any other, not a crash) rather than the
    // save itself failing.
    const unrelated = await patchGoal(task.id, { estimateMinutes: 45 })
    expect(unrelated.statusCode).toBe(200)
    expect(unrelated.json().data.subjectId).toBe(page.id)
    expect(unrelated.json().data.actionTarget).toBe(`/landing-pages/${page.id}`)

    // Actively re-setting the same (now-deleted) record fails cleanly — a normal 404, not a crash.
    const reset = await patchGoal(task.id, { subjectType: 'PAGE', subjectId: page.id })
    expect(reset.statusCode).toBe(404)
  })
})

describe('calendar recurrence (RecurringGoalService)', () => {
  it('generates exactly one next instance once the current one is due, and stays idempotent across ticks', async () => {
    const anchorDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // yesterday — already "due"
    const task = await createScheduledTask('Post weekly update', anchorDate)
    const set = await patchGoal(task.id, { recurrenceRule: 'WEEKLY' })
    expect(set.statusCode).toBe(200)
    const groupId = set.json().data.id // series id defaults to the anchor's own id

    const first = await runDueRecurringGoals()
    expect(first.created).toBeGreaterThanOrEqual(1)

    const generated = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: groupId, id: { not: task.id } },
    })
    expect(generated).not.toBeNull()
    expect(generated!.recurrenceRule).toBe('WEEKLY')
    expect(generated!.status).toBe('SCHEDULED')
    expect(generated!.scheduledFor!.getTime()).toBeGreaterThan(new Date().getTime())
    expect(generated!.scheduledFor!.getTime()).toBe(
      new Date(anchorDate.getTime() + 7 * 24 * 60 * 60 * 1000).getTime(),
    )

    // A second tick must not generate a duplicate — the new instance is already in the future.
    const countBefore = await db.scheduledGoal.count({ where: { recurrenceGroupId: groupId } })
    await runDueRecurringGoals()
    const countAfter = await db.scheduledGoal.count({ where: { recurrenceGroupId: groupId } })
    expect(countAfter).toBe(countBefore)
  })

  it('skips weekends for WEEKDAYS', async () => {
    // A known Friday, in the past.
    const friday = new Date('2026-09-11T09:00:00.000Z')
    const task = await createScheduledTask('Weekday standup note', friday)
    const set = await patchGoal(task.id, { recurrenceRule: 'WEEKDAYS' })
    expect(set.statusCode).toBe(200)
    const groupId = set.json().data.id

    await runDueRecurringGoals()
    const generated = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: groupId, id: { not: task.id } },
    })
    expect(generated).not.toBeNull()
    // Friday + 1 day = Saturday, must roll to Monday.
    expect(generated!.scheduledFor!.getUTCDay()).toBe(1)
  })

  it('stops the series once "Repeats" is cleared on the latest instance, and respects recurrenceEndDate', async () => {
    const anchorDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const stoppable = await createScheduledTask('Series to be stopped', anchorDate)
    await patchGoal(stoppable.id, { recurrenceRule: 'DAILY' })
    const stopRes = await patchGoal(stoppable.id, { recurrenceRule: null })
    expect(stopRes.statusCode).toBe(200)
    await runDueRecurringGoals()
    const generatedForStopped = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: stoppable.id, id: { not: stoppable.id } },
    })
    expect(generatedForStopped).toBeNull()

    const capped = await createScheduledTask('Series with an end date', anchorDate)
    await patchGoal(capped.id, {
      recurrenceRule: 'WEEKLY',
      recurrenceEndDate: new Date(anchorDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // ends before the next weekly occurrence would land
    })
    const cappedGroupId = capped.id
    await runDueRecurringGoals()
    const generatedForCapped = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: cappedGroupId, id: { not: capped.id } },
    })
    expect(generatedForCapped).toBeNull()
  })

  it('anchors the next occurrence from a manually rescheduled instance, not its original date', async () => {
    const originalDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    const task = await createScheduledTask('Post update', originalDate)
    await patchGoal(task.id, { recurrenceRule: 'DAILY' })

    // Manually move it to yesterday instead — the popover/rail's own Reschedule action.
    const movedTo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const moved = await patchGoal(task.id, { scheduledFor: movedTo.toISOString(), hasTime: false })
    expect(moved.statusCode).toBe(200)

    await runDueRecurringGoals()
    const generated = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: task.id, id: { not: task.id } },
    })
    expect(generated).not.toBeNull()
    // Anchored from movedTo (+1 day), not the original, now-discarded anchor date.
    expect(generated!.scheduledFor!.getTime()).toBe(movedTo.getTime() + 24 * 60 * 60 * 1000)
  })

  // The real gap this pass's review caught: once a future instance has been generated ahead of
  // time, BOTH it and the still-open current instance carry the same recurrenceRule — but the
  // poller only ever consults the group's latest (max scheduledFor) row. A user is at least as
  // likely to open the current instance (the one due today) as the generated-ahead one, so
  // clearing "Repeats" there must still stop the whole series — see CalendarService.updateGoal's
  // sibling-propagation block.
  it('stops the whole series when "Repeats" is cleared on the CURRENT instance, not just the latest generated one', async () => {
    const anchorDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const current = await createScheduledTask('Daily standup note', anchorDate)
    await patchGoal(current.id, { recurrenceRule: 'DAILY' })
    const groupId = current.id

    await runDueRecurringGoals()
    const future = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: groupId, id: { not: current.id } },
    })
    expect(future).not.toBeNull()
    expect(future!.recurrenceRule).toBe('DAILY') // both rows currently carry the rule

    const stopRes = await patchGoal(current.id, { recurrenceRule: null })
    expect(stopRes.statusCode).toBe(200)

    // Propagation must have cleared it on the future sibling too.
    const futureAfter = await db.scheduledGoal.findUnique({ where: { id: future!.id } })
    expect(futureAfter!.recurrenceRule).toBeNull()

    const countBefore = await db.scheduledGoal.count({ where: { recurrenceGroupId: groupId } })
    await runDueRecurringGoals()
    const countAfter = await db.scheduledGoal.count({ where: { recurrenceGroupId: groupId } })
    expect(countAfter).toBe(countBefore)
  })

  it('propagates a recurrenceEndDate set on the current instance to an already-generated future sibling, and the poller honors it', async () => {
    // Far enough in the past that WEEKLY's first hop (anchor + 7d) is still in the past too — the
    // rest of the sequence is driven entirely by real poller ticks acting on real due dates, no
    // artificially-moved dates (an earlier version of this test manually rewound a date to force a
    // second tick and, in doing so, silently invalidated its own end-date math — a real lesson,
    // not a hypothetical one).
    const anchorDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const current = await createScheduledTask('Weekly digest', anchorDate)
    await patchGoal(current.id, { recurrenceRule: 'WEEKLY' })
    const groupId = current.id

    await runDueRecurringGoals() // anchor(-10d) -> future1 at -3d (still due)
    const future = await db.scheduledGoal.findFirst({
      where: { recurrenceGroupId: groupId, id: { not: current.id } },
    })
    expect(future).not.toBeNull()
    expect(future!.scheduledFor!.getTime()).toBeLessThan(Date.now()) // confirm it's still due

    // An end date, set on the CURRENT instance, that falls before future's own next hop (-3d + 7d
    // = +4d) but after future's own date (-3d) — so future's *next* generation is what must stop.
    const endDate = new Date(future!.scheduledFor!.getTime() + 24 * 60 * 60 * 1000) // -2d
    const endRes = await patchGoal(current.id, { recurrenceEndDate: endDate.toISOString() })
    expect(endRes.statusCode).toBe(200)

    const futureAfter = await db.scheduledGoal.findUnique({ where: { id: future!.id } })
    expect(futureAfter!.recurrenceEndDate?.getTime()).toBe(endDate.getTime())

    // A real second tick: future is now the group's latest (-3d, more recent than current's
    // -10d) and still due, so the poller acts on it directly — no test-side date manipulation.
    await runDueRecurringGoals()
    const countAfter = await db.scheduledGoal.count({ where: { recurrenceGroupId: groupId } })
    expect(countAfter).toBe(2) // current + future only — the propagated end date stopped the next hop
  })

  it('generates only one next instance even when the poller races itself', async () => {
    const anchorDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const task = await createScheduledTask('Race test task', anchorDate)
    await patchGoal(task.id, { recurrenceRule: 'DAILY' })
    const groupId = task.id

    await Promise.all([runDueRecurringGoals(), runDueRecurringGoals(), runDueRecurringGoals()])

    const siblings = await db.scheduledGoal.findMany({
      where: { recurrenceGroupId: groupId, id: { not: groupId } },
    })
    expect(siblings.length).toBe(1)
  })
})
