// Time Tracking, Phase 2 (2026-09-09): TimeEntry start/current/stop. The one invariant worth
// proving with a real HTTP round trip rather than just reading the code is the global (not
// per-business) one-running-entry rule — see the last test below.
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testBusinessId,
  testOtherBusinessId,
  testShopUserId,
} from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function start(payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/time-entries/start',
    headers: asAuth(testUserId),
    payload,
  })
}

async function current() {
  return app.inject({ method: 'GET', url: '/time-entries/current', headers: asAuth(testUserId) })
}

async function stop(payload: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/time-entries/current/stop',
    headers: asAuth(testUserId),
    payload,
  })
}

describe('time entries', () => {
  it('starts, reads, and stops a running entry', async () => {
    const startRes = await start({ description: 'Editing the Acme commercial' })
    expect(startRes.statusCode).toBe(201)
    const entry = startRes.json().data
    expect(entry.description).toBe('Editing the Acme commercial')
    expect(entry.businessId).toBe(testBusinessId)
    expect(entry.businessName).toBe('Alice Co.')
    expect(entry.endedAt).toBeNull()

    const currentRes = await current()
    expect(currentRes.statusCode).toBe(200)
    expect(currentRes.json().data.id).toBe(entry.id)

    const stopRes = await stop()
    expect(stopRes.statusCode).toBe(200)
    expect(stopRes.json().data.id).toBe(entry.id)
    expect(stopRes.json().data.endedAt).not.toBeNull()

    const afterStop = await current()
    expect(afterStop.json().data).toBeNull()
  })

  it('never auto-stops — starting a second entry while one runs returns 409 with the existing entry', async () => {
    const first = await start({ description: 'First task' })
    const firstEntry = first.json().data

    const secondRes = await start({ description: 'Second task' })
    expect(secondRes.statusCode).toBe(409)
    const body = secondRes.json()
    expect(body.code).toBe('ACTIVE_TIME_ENTRY_EXISTS')
    expect(body.data.id).toBe(firstEntry.id)
    expect(body.data.description).toBe('First task')

    // The first entry is still the one running, untouched.
    const currentRes = await current()
    expect(currentRes.json().data.id).toBe(firstEntry.id)
  })

  it('requires a non-empty description', async () => {
    const res = await start({ description: '   ' })
    expect(res.statusCode).toBe(400)
  })

  it('404s when nothing is running to stop', async () => {
    const res = await stop()
    expect(res.statusCode).toBe(404)
  })

  it('links to a real scheduled task in the same business, and rejects one from another business', async () => {
    const idea = await app.inject({
      method: 'POST',
      url: '/calendar/ideas',
      headers: asAuth(testUserId),
      payload: { title: 'A task to track time against' },
    })
    const scheduled = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${idea.json().data.templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    const goalId = scheduled.json().data.id

    const linkedRes = await start({ description: 'Working on it', scheduledGoalId: goalId })
    expect(linkedRes.statusCode).toBe(201)
    expect(linkedRes.json().data.scheduledGoalId).toBe(goalId)
    await stop()

    const foreignGoal = await db.scheduledGoal.create({
      data: {
        businessId: testOtherBusinessId,
        title: 'A task from another business',
        source: 'USER_CREATED',
        status: 'SCHEDULED',
      },
    })
    const foreignRes = await start({ description: 'Should fail', scheduledGoalId: foreignGoal.id })
    expect(foreignRes.statusCode).toBe(404)
  })

  it("allows correcting a forgotten timer's end time, within bounds", async () => {
    const startRes = await start({ description: 'Forgot to stop this' })
    const entry = startRes.json().data
    const startedAt = new Date(entry.startedAt)

    // Before it started — rejected.
    const tooEarly = await stop({ endedAt: new Date(startedAt.getTime() - 60_000).toISOString() })
    expect(tooEarly.statusCode).toBe(400)

    // In the future — rejected.
    const tooLate = await stop({ endedAt: new Date(Date.now() + 60 * 60_000).toISOString() })
    expect(tooLate.statusCode).toBe(400)

    // A real correction: some real wall-clock time after it started, safely within
    // [startedAt, now] — a fixed offset risks landing in the future if these in-process calls
    // all run faster than the offset, so wait for real time to actually pass instead.
    await new Promise((resolve) => setTimeout(resolve, 20))
    const correctedEnd = new Date().toISOString()
    const okRes = await stop({ endedAt: correctedEnd })
    expect(okRes.statusCode).toBe(200)
    expect(new Date(okRes.json().data.endedAt).toISOString()).toBe(correctedEnd)
  })

  it('enforces one running entry per user GLOBALLY, not per business', async () => {
    await db.businessMembership.create({
      data: { userId: testUserId, businessId: testOtherBusinessId, role: 'MEMBER' },
    })

    // Start a timer under the default active business (testBusinessId / "Alice Co.").
    const firstRes = await start({ description: 'Working for Alice Co.' })
    const firstEntry = firstRes.json().data
    expect(firstEntry.businessId).toBe(testBusinessId)

    // Switch active business — the test auth bypass resolves businessId from User.businessId,
    // and setActiveBusiness's test-mode path mutates it directly (see helpers/index.ts's comment).
    const switchRes = await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testUserId),
      payload: { businessId: testOtherBusinessId },
    })
    expect(switchRes.statusCode).toBe(200)

    // Attempting to start a second timer under the OTHER business still 409s — proving the
    // constraint is global (runningForUserId), not scoped to businessId.
    const secondRes = await start({ description: 'Working for Bob Co.' })
    expect(secondRes.statusCode).toBe(409)
    expect(secondRes.json().data.id).toBe(firstEntry.id)
    expect(secondRes.json().data.businessId).toBe(testBusinessId)
  })

  // Phase 4 hardening (2026-09-09) — the two-tab race this project's own "never auto-stop"
  // rejected-alternatives table calls out by name: relying on find-then-create loses the race,
  // which is exactly why start() creates directly and catches the unique-constraint conflict
  // instead. This proves that mechanism under real concurrency, not just sequentially.
  it('a genuine concurrent double-start race yields exactly one winner and one conflict, never two running entries', async () => {
    const [a, b] = await Promise.allSettled([
      start({ description: 'Race A' }),
      start({ description: 'Race B' }),
    ])
    const responses = [a, b].map((r) => (r.status === 'fulfilled' ? r.value : null))
    expect(responses.every((r) => r !== null)).toBe(true)
    const statuses = responses.map((r) => r!.statusCode).sort()
    expect(statuses).toEqual([201, 409])

    const runningCount = await db.timeEntry.count({
      where: { userId: testUserId, endedAt: null },
    })
    expect(runningCount).toBe(1)

    await stop()
  })

  it('stopping twice in a row is safe — the second call 404s without disturbing the first stop', async () => {
    const startRes = await start({ description: 'Stop me once' })
    const entry = startRes.json().data

    const firstStop = await stop()
    expect(firstStop.statusCode).toBe(200)

    const secondStop = await stop()
    expect(secondStop.statusCode).toBe(404)

    const row = await db.timeEntry.findUnique({ where: { id: entry.id } })
    expect(row?.endedAt?.toISOString()).toBe(firstStop.json().data.endedAt)
  })

  it('survives its linked task being completed, and has the link cleared (not a crash) if that task is later deleted', async () => {
    const idea = await app.inject({
      method: 'POST',
      url: '/calendar/ideas',
      headers: asAuth(testUserId),
      payload: { title: 'Linked task for lifecycle test' },
    })
    const scheduled = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${idea.json().data.templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    const goalId = scheduled.json().data.id

    const startRes = await start({
      description: 'Working on the linked task',
      scheduledGoalId: goalId,
    })
    expect(startRes.statusCode).toBe(201)

    // Completing the linked task doesn't touch the running entry.
    const completeRes = await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goalId}`,
      headers: asAuth(testUserId),
      payload: { status: 'DONE' },
    })
    expect(completeRes.statusCode).toBe(200)
    const stillCurrent = await current()
    expect(stillCurrent.json().data.scheduledGoalId).toBe(goalId)

    // Deleting the goal outright degrades cleanly — TimeEntry.scheduledGoalId is onDelete: SET
    // NULL, not a crash or an orphaned dangling id.
    await db.scheduledGoal.delete({ where: { id: goalId } })
    const afterDelete = await current()
    expect(afterDelete.statusCode).toBe(200)
    expect(afterDelete.json().data.scheduledGoalId).toBeNull()

    await stop()
  })

  it('accepts a correction for a genuinely long-forgotten timer — no hidden server-side duration cap', async () => {
    const startRes = await start({ description: 'Forgot about this for ages' })
    const entry = startRes.json().data
    // startedAt is otherwise immutable through the API (by design) — back-dating it here
    // directly is the only way to simulate a real multi-day forgotten timer for this test.
    const backdatedStart = new Date(Date.now() - 30 * 60 * 60 * 1000)
    await db.timeEntry.update({ where: { id: entry.id }, data: { startedAt: backdatedStart } })

    const endedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const res = await stop({ endedAt })
    expect(res.statusCode).toBe(200)
    expect(new Date(res.json().data.endedAt).toISOString()).toBe(new Date(endedAt).toISOString())
  })

  it('lets a timer link to a task assigned to a different teammate, and is unaffected by that teammate later being suspended', async () => {
    const idea = await app.inject({
      method: 'POST',
      url: '/calendar/ideas',
      headers: asAuth(testUserId),
      payload: { title: 'Assigned to a teammate' },
    })
    const scheduled = await app.inject({
      method: 'POST',
      url: `/calendar/ideas/${idea.json().data.templateId}/schedule`,
      headers: asAuth(testUserId),
      payload: { when: 'TODAY' },
    })
    const goalId = scheduled.json().data.id
    await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goalId}`,
      headers: asAuth(testUserId),
      payload: { assignedToUserId: testShopUserId },
    })

    // Assignment is informational, not an access boundary (this epic's own "no new permission
    // gate" decision) — the caller need not be the assignee to track time against it.
    const startRes = await start({ description: 'Helping out', scheduledGoalId: goalId })
    expect(startRes.statusCode).toBe(201)
    expect(startRes.json().data.scheduledGoalId).toBe(goalId)

    await db.businessMembership.updateMany({
      where: { businessId: testBusinessId, userId: testShopUserId },
      data: { suspendedAt: new Date() },
    })

    const stillCurrent = await current()
    expect(stillCurrent.statusCode).toBe(200)
    expect(stillCurrent.json().data.scheduledGoalId).toBe(goalId)

    await stop()
  })
})
