import { describe, expect, it } from 'vitest'
import { db } from '@project/db'
import {
  asAuth,
  buildTestApp,
  testBusinessId,
  testOtherBusinessId,
  testOtherUserId,
  testShopUserId,
  testUserId,
  validateResponse,
} from './helpers'

const app = buildTestApp()

describe('Teams / multi-company membership', () => {
  it('lists memberships and marks the active company', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/businesses',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listMyBusinesses', 200, res.json())
    const data = res.json().data as Array<{ id: string; active: boolean; isFounder: boolean }>
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({
      id: testBusinessId,
      active: true,
      isFounder: true,
      role: 'OWNER',
    })
  })

  it('lets an owner invite by email and accept as that user', async () => {
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/business/team/invitations',
      headers: asAuth(testUserId),
      payload: {
        email: 'bob@test.local',
        role: 'MEMBER',
        jobTitle: 'Contractor',
      },
    })
    expect(inviteRes.statusCode).toBe(201)
    await validateResponse('inviteTeamMember', 201, inviteRes.json())
    const acceptUrl = inviteRes.json().data.acceptUrl as string
    const token = acceptUrl.split('/').filter(Boolean)[1]

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invitations/${token}/accept`,
      headers: asAuth(testOtherUserId),
    })
    expect(acceptRes.statusCode).toBe(200)
    await validateResponse('acceptInvitation', 200, acceptRes.json())
    expect(acceptRes.json().data.businessId).toBe(testBusinessId)
    expect(acceptRes.json().data.membershipRole).toBe('MEMBER')

    const list = await app.inject({
      method: 'GET',
      url: '/me/businesses',
      headers: asAuth(testOtherUserId),
    })
    const companies = list.json().data as Array<{ id: string }>
    expect(companies.map((c) => c.id).sort()).toEqual([testBusinessId, testOtherBusinessId].sort())

    // Idempotent re-accept: same token should still resolve cleanly.
    const acceptAgain = await app.inject({
      method: 'POST',
      url: `/invitations/${token}/accept`,
      headers: asAuth(testOtherUserId),
    })
    expect(acceptAgain.statusCode).toBe(200)
    expect(acceptAgain.json().data.businessId).toBe(testBusinessId)
  })

  it('forbids members from inviting and protects the founder from suspend/remove', async () => {
    const inviteDenied = await app.inject({
      method: 'POST',
      url: '/business/team/invitations',
      headers: asAuth(testShopUserId),
      payload: { email: 'someone@example.com' },
    })
    expect(inviteDenied.statusCode).toBe(403)

    const suspendFounder = await app.inject({
      method: 'PATCH',
      url: `/business/team/members/${testUserId}`,
      headers: asAuth(testUserId),
      payload: { suspended: true },
    })
    // Even an owner cannot suspend the founder (themselves as founder in this seed).
    expect(suspendFounder.statusCode).toBe(403)

    const removeFounder = await app.inject({
      method: 'DELETE',
      url: `/business/team/members/${testUserId}`,
      headers: asAuth(testUserId),
    })
    expect(removeFounder.statusCode).toBe(400)

    // Shop cannot remove founder either once promoted isn't possible — create a second owner path:
    // alice tries to remove shop (ok), then shop cannot remove alice.
    const removeByShop = await app.inject({
      method: 'DELETE',
      url: `/business/team/members/${testUserId}`,
      headers: asAuth(testShopUserId),
    })
    expect(removeByShop.statusCode).toBe(403)
  })

  it('switches active company and scopes subsequent team reads', async () => {
    await db.businessMembership.create({
      data: {
        userId: testUserId,
        businessId: testOtherBusinessId,
        role: 'MEMBER',
        jobTitle: 'Advisor',
      },
    })

    const switched = await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testUserId),
      payload: { businessId: testOtherBusinessId },
    })
    expect(switched.statusCode).toBe(200)
    expect(switched.json().data.businessId).toBe(testOtherBusinessId)
    expect(switched.json().data.membershipRole).toBe('MEMBER')
    expect(switched.json().data.isFounder).toBe(false)

    const team = await app.inject({
      method: 'GET',
      url: '/business/team',
      headers: asAuth(testUserId),
    })
    expect(team.statusCode).toBe(200)
    const members = team.json().data.members as Array<{ email: string; isFounder: boolean }>
    expect(members.some((m) => m.email === 'bob@test.local' && m.isFounder)).toBe(true)
    expect(members.some((m) => m.email === 'shop@test.local')).toBe(false)
  })

  it('returns member metrics for a teammate', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/business/team/members/${testShopUserId}/metrics`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getTeamMemberMetrics', 200, res.json())
    expect(res.json().data.email).toBe('shop@test.local')
    expect(res.json().data.metrics).toEqual({
      notesWritten: 0,
      pagesPublished: 0,
      adRevisionsCreated: 0,
    })
  })

  it('blocks switching to a company without membership', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testShopUserId),
      payload: { businessId: testOtherBusinessId },
    })
    expect(res.statusCode).toBe(403)
  })

  it('exposes invite status so reused links are intentional UX', async () => {
    const invited = await app.inject({
      method: 'POST',
      url: '/business/team/invitations',
      headers: asAuth(testUserId),
      payload: { email: 'bob@test.local', role: 'MEMBER' },
    })
    const token = invited.json().data.acceptUrl.split('/').filter(Boolean)[1]

    const pending = await app.inject({
      method: 'GET',
      url: `/invitations/${token}`,
      headers: asAuth(testUserId),
    })
    expect(pending.statusCode).toBe(200)
    expect(pending.json().data.status).toBe('PENDING')

    await app.inject({
      method: 'POST',
      url: `/invitations/${token}/accept`,
      headers: asAuth(testOtherUserId),
    })

    const accepted = await app.inject({
      method: 'GET',
      url: `/invitations/${token}`,
      headers: asAuth(testUserId),
    })
    expect(accepted.statusCode).toBe(200)
    expect(accepted.json().data.status).toBe('ACCEPTED')
  })

  it('keeps suspension company-scoped and falls back active company safely', async () => {
    // Give bob membership in Alice's company and make it active.
    await db.businessMembership.create({
      data: {
        userId: testOtherUserId,
        businessId: testBusinessId,
        role: 'MEMBER',
      },
    })
    await db.user.update({
      where: { id: testOtherUserId },
      data: { businessId: testBusinessId },
    })

    // Owner suspends bob in Alice Co only.
    const suspended = await app.inject({
      method: 'PATCH',
      url: `/business/team/members/${testOtherUserId}`,
      headers: asAuth(testUserId),
      payload: { suspended: true },
    })
    expect(suspended.statusCode).toBe(200)
    expect(suspended.json().data.suspendedAt).toBeTruthy()

    // Bob still has access through his other company and auth resolves there.
    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: asAuth(testOtherUserId),
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().data.businessId).toBe(testOtherBusinessId)

    // Suspended company cannot be selected as active.
    const switchDenied = await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testOtherUserId),
      payload: { businessId: testBusinessId },
    })
    expect(switchDenied.statusCode).toBe(403)
  })

  it('isolates direct entity URLs by active company', async () => {
    // Bob belongs to both companies.
    await db.businessMembership.create({
      data: {
        userId: testOtherUserId,
        businessId: testBusinessId,
        role: 'MEMBER',
      },
    })

    const contactA = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Alice Co Contact' },
    })
    const contactB = await db.contact.create({
      data: { businessId: testOtherBusinessId, name: 'Bob Co Contact' },
    })

    await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testOtherUserId),
      payload: { businessId: testBusinessId },
    })

    const listA = await app.inject({
      method: 'GET',
      url: '/contacts',
      headers: asAuth(testOtherUserId),
    })
    expect(listA.statusCode).toBe(200)
    expect(listA.json().data.some((c: { id: string }) => c.id === contactA.id)).toBe(true)
    expect(listA.json().data.some((c: { id: string }) => c.id === contactB.id)).toBe(false)

    const getBWhileA = await app.inject({
      method: 'GET',
      url: `/contacts/${contactB.id}`,
      headers: asAuth(testOtherUserId),
    })
    expect(getBWhileA.statusCode).toBe(404)

    await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testOtherUserId),
      payload: { businessId: testOtherBusinessId },
    })

    const listB = await app.inject({
      method: 'GET',
      url: '/contacts',
      headers: asAuth(testOtherUserId),
    })
    expect(listB.statusCode).toBe(200)
    expect(listB.json().data.some((c: { id: string }) => c.id === contactB.id)).toBe(true)
    expect(listB.json().data.some((c: { id: string }) => c.id === contactA.id)).toBe(false)
  })
})
