import { describe, expect, it } from 'vitest'
import { db } from '@project/db'
import { asAuth, buildTestApp, testBusinessId, testUserId } from './helpers'

const app = buildTestApp()

async function createAdvertisement(name: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name },
  })
  expect(response.statusCode).toBe(201)
  return response.json().data.id as string
}

describe('advertisement deletion', () => {
  it('soft-deletes a draft and excludes it from reads', async () => {
    const advertisementId = await createAdvertisement('Delete this draft')

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/advertisements/${advertisementId}`,
      headers: asAuth(testUserId),
    })
    expect(deleted.statusCode).toBe(200)

    const get = await app.inject({
      method: 'GET',
      url: `/advertisements/${advertisementId}`,
      headers: asAuth(testUserId),
    })
    expect(get.statusCode).toBe(404)
    expect(
      (await db.advertisement.findUnique({ where: { id: advertisementId } }))?.deletedAt,
    ).toBeTruthy()
  })

  it('does not hide an ad while a destination could still deliver', async () => {
    const advertisementId = await createAdvertisement('Still delivering')
    await db.adRun.create({
      data: {
        advertisementId,
        platform: 'META',
        placement: 'FEED',
        status: 'PAUSED',
        budget: 10,
      },
    })

    const response = await app.inject({
      method: 'DELETE',
      url: `/advertisements/${advertisementId}`,
      headers: asAuth(testUserId),
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error).toContain('End every active or paused destination')
    expect(
      await db.advertisement.findFirst({
        where: { id: advertisementId, businessId: testBusinessId },
      }),
    ).toBeTruthy()
  })
})
