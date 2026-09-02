// Filled-in integration test (not a generated stub) for the CRM avatar + notes polish slice —
// see CLAUDE.md's dated entry for the design. Covers: setting/clearing a contact's avatar via
// PATCH, avatarUrl resolving on both list and detail without a client-side Asset fetch, and the
// new ContactNote CRUD (create/list/edit/pin/delete) including tenant isolation.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact() {
  return db.contact.create({
    data: { businessId: testBusinessId, name: 'Priya Shah', email: 'priya@example.com' },
  })
}

async function seedAsset() {
  return db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name: 'headshot.jpg',
      url: '/media/headshot.jpg',
    },
  })
}

describe('contact avatar', () => {
  it('can be set at creation time, not just via a follow-up PATCH', async () => {
    const asset = await seedAsset()
    const res = await app.inject({
      method: 'POST',
      url: '/contacts',
      headers: asAuth(testUserId),
      payload: { name: 'New With Photo', avatarAssetId: asset.id },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.avatarAssetId).toBe(asset.id)
    expect(res.json().data.avatarUrl).toBe('/media/headshot.jpg')
  })

  it('sets and clears avatarAssetId, resolving avatarUrl on the DTO', async () => {
    const contact = await seedContact()
    const asset = await seedAsset()

    const setRes = await app.inject({
      method: 'PATCH',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
      payload: { avatarAssetId: asset.id },
    })
    expect(setRes.statusCode).toBe(200)
    expect(setRes.json().data.avatarAssetId).toBe(asset.id)
    expect(setRes.json().data.avatarUrl).toBe('/media/headshot.jpg')

    const getRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(getRes.json().data.avatarUrl).toBe('/media/headshot.jpg')

    const listRes = await app.inject({
      method: 'GET',
      url: '/contacts',
      headers: asAuth(testUserId),
    })
    const row = listRes.json().data.find((c: any) => c.id === contact.id)
    expect(row.avatarUrl).toBe('/media/headshot.jpg')

    const clearRes = await app.inject({
      method: 'PATCH',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
      payload: { avatarAssetId: null },
    })
    expect(clearRes.json().data.avatarAssetId).toBeNull()
    expect(clearRes.json().data.avatarUrl).toBeNull()
  })
})

describe('contact notes', () => {
  it('creates, lists, edits, pins, and deletes a note', async () => {
    const contact = await seedContact()

    const createRes = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/notes`,
      headers: asAuth(testUserId),
      payload: { body: 'Prefers text over email.' },
    })
    expect(createRes.statusCode).toBe(201)
    const note = createRes.json().data
    expect(note.body).toBe('Prefers text over email.')
    expect(note.authorUserId).toBe(testUserId)
    expect(note.pinnedAt).toBeNull()

    const listRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/notes`,
      headers: asAuth(testUserId),
    })
    expect(listRes.json().data.map((n: any) => n.id)).toEqual([note.id])

    const pinRes = await app.inject({
      method: 'PATCH',
      url: `/contacts/${contact.id}/notes/${note.id}`,
      headers: asAuth(testUserId),
      payload: { pinned: true },
    })
    expect(pinRes.json().data.pinnedAt).not.toBeNull()

    const editRes = await app.inject({
      method: 'PATCH',
      url: `/contacts/${contact.id}/notes/${note.id}`,
      headers: asAuth(testUserId),
      payload: { body: 'Prefers text; do not call before 5pm.' },
    })
    expect(editRes.json().data.body).toBe('Prefers text; do not call before 5pm.')
    // Editing body alone must not clobber the pin set moments earlier.
    expect(editRes.json().data.pinnedAt).not.toBeNull()

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/contacts/${contact.id}/notes/${note.id}`,
      headers: asAuth(testUserId),
    })
    expect(deleteRes.statusCode).toBe(200)

    const afterDelete = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/notes`,
      headers: asAuth(testUserId),
    })
    expect(afterDelete.json().data).toEqual([])
  })

  it('404s across tenants for both the contact and the note', async () => {
    const contact = await seedContact()
    const createRes = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/notes`,
      headers: asAuth(testUserId),
      payload: { body: 'Alice-only note' },
    })
    const noteId = createRes.json().data.id

    const listAsOther = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/notes`,
      headers: asAuth(testOtherUserId),
    })
    expect(listAsOther.statusCode).toBe(404)

    const editAsOther = await app.inject({
      method: 'PATCH',
      url: `/contacts/${contact.id}/notes/${noteId}`,
      headers: asAuth(testOtherUserId),
      payload: { body: 'hijacked' },
    })
    expect(editAsOther.statusCode).toBe(404)
  })
})
