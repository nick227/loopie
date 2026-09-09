// Time Tracking & Team Activity epic, Phase 3 (2026-09-09): TeamService.getActivity /
// GET /business/team/activity. Compact tracking state only — no presence, no lastSeenAt, no
// sockets, no online indicator. See the endpoint's own openapi description for the product rule
// this file proves: "not tracking" is not "offline," there is no such signal.
import { describe, expect, it } from 'vitest'
import { db } from '@project/db'
import {
  asAuth,
  buildTestApp,
  testOtherBusinessId,
  testOtherUserId,
  testShopUserId,
  testUserId,
  validateResponse,
} from './helpers'

const app = buildTestApp()

async function getActivity(userId: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/business/team/activity',
    headers: asAuth(userId),
  })
  await validateResponse('getTeamActivity', 200, res.json())
  return res
}

describe('team activity', () => {
  it('lists every active member with null currentEntry when nobody is tracking', async () => {
    const res = await getActivity(testUserId)
    expect(res.statusCode).toBe(200)
    const rows = res.json().data as Array<{ userId: string; currentEntry: unknown }>
    // Seeded: testUserId (founder) + testShopUserId (member), both on testBusinessId.
    expect(rows.map((r) => r.userId).sort()).toEqual([testShopUserId, testUserId].sort())
    expect(rows.every((r) => r.currentEntry === null)).toBe(true)
  })

  it("projects a member's current running entry, and clears it once they stop", async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/time-entries/start',
      headers: asAuth(testShopUserId),
      payload: { description: 'Prepping the Acme shoot' },
    })
    expect(start.statusCode).toBe(201)

    const withEntry = await getActivity(testUserId)
    const shopRow = (withEntry.json().data as Array<any>).find((r) => r.userId === testShopUserId)
    expect(shopRow.currentEntry).not.toBeNull()
    expect(shopRow.currentEntry.description).toBe('Prepping the Acme shoot')
    expect(shopRow.currentEntry.scheduledGoalId).toBeNull()
    expect(typeof shopRow.currentEntry.startedAt).toBe('string')

    await app.inject({
      method: 'POST',
      url: '/time-entries/current/stop',
      headers: asAuth(testShopUserId),
    })

    const afterStop = await getActivity(testUserId)
    const shopRowAfter = (afterStop.json().data as Array<any>).find(
      (r) => r.userId === testShopUserId,
    )
    expect(shopRowAfter.currentEntry).toBeNull()
  })

  it('excludes a suspended member entirely, even while they have a running entry', async () => {
    await app.inject({
      method: 'POST',
      url: '/time-entries/start',
      headers: asAuth(testShopUserId),
      payload: { description: 'Working before being suspended' },
    })

    const suspendRes = await app.inject({
      method: 'PATCH',
      url: `/business/team/members/${testShopUserId}`,
      headers: asAuth(testUserId),
      payload: { suspended: true },
    })
    expect(suspendRes.statusCode).toBe(200)

    const res = await getActivity(testUserId)
    const rows = res.json().data as Array<{ userId: string }>
    expect(rows.map((r) => r.userId)).not.toContain(testShopUserId)
  })

  it("keeps a member's tracked time private to the business they started it under", async () => {
    // testUserId already belongs to testBusinessId (founder); add them to testOtherBusinessId too.
    await db.businessMembership.create({
      data: { userId: testUserId, businessId: testOtherBusinessId, role: 'MEMBER' },
    })

    // Bypass HTTP for the cross-business setup — a running entry started directly under
    // testOtherBusinessId, not via /time-entries/start (which always targets the caller's
    // *active* business and can't run two businesses' entries at once for the same user anyway).
    await db.timeEntry.create({
      data: {
        businessId: testOtherBusinessId,
        userId: testUserId,
        description: 'Working for Bob Co.',
        runningForUserId: testUserId,
      },
    })

    // testBusinessId's own activity view never sees it — it belongs to a different business.
    const fromTestBusiness = await getActivity(testUserId)
    const meInTestBusiness = (fromTestBusiness.json().data as Array<any>).find(
      (r) => r.userId === testUserId,
    )
    expect(meInTestBusiness.currentEntry).toBeNull()

    // testOtherBusinessId's own activity view does see it — same person, right business.
    const fromOtherBusiness = await app.inject({
      method: 'GET',
      url: '/business/team/activity',
      headers: asAuth(testOtherUserId),
    })
    expect(fromOtherBusiness.statusCode).toBe(200)
    const meInOtherBusiness = (fromOtherBusiness.json().data as Array<any>).find(
      (r) => r.userId === testUserId,
    )
    expect(meInOtherBusiness.currentEntry).not.toBeNull()
    expect(meInOtherBusiness.currentEntry.description).toBe('Working for Bob Co.')
  })
})
