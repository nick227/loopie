// Filled-in integration test (not a generated stub) for the CRM structured-tags slice — a real
// business-scoped ContactTag catalog + ContactTagAssignment join, replacing the old free-form
// Contact.tags JSON array. See CLAUDE.md's dated entry for the full design and the real backfill
// run against the shared dev DB (2 legacy tags, "cool" and "past-customer", migrated 1:1 and
// verified — not re-tested here since the source JSON column no longer exists in the schema at
// all once the migration completes; that's a one-time historical event, not a repeatable code
// path). What stays permanently testable, and is covered below, is that the *ongoing* write path
// (tags: string[] on Create/UpdateContactInput, and the new assign/unassign endpoints) produces
// exactly the same round-trip semantics the legacy JSON array used to.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact(businessId = testBusinessId, name = 'Tag Contact') {
  return db.contact.create({
    data: {
      businessId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
}

describe('ContactTag catalog', () => {
  it('the same tag name cannot duplicate within one business', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'VIP' },
    })
    expect(first.statusCode).toBe(201)

    const dupe = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'vip' }, // different casing, same normalized key
    })
    expect(dupe.statusCode).toBe(409)

    const catalog = await app.inject({
      method: 'GET',
      url: '/contact-tags',
      headers: asAuth(testUserId),
    })
    expect(catalog.json().data.filter((t: any) => t.name.toLowerCase() === 'vip').length).toBe(1)
    // Casing from the first create is preserved, not silently overwritten by the rejected retry.
    expect(catalog.json().data.find((t: any) => t.name.toLowerCase() === 'vip').name).toBe('VIP')
  })

  it('the same name can exist in different businesses', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Repeat Buyer' },
    })
    expect(a.statusCode).toBe(201)

    const b = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testOtherUserId),
      payload: { name: 'Repeat Buyer' },
    })
    expect(b.statusCode).toBe(201)
    expect(a.json().data.id).not.toBe(b.json().data.id)
  })

  it('renaming a catalog tag updates every contact wearing it implicitly', async () => {
    const contact = await seedContact()
    const create = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Old Name', color: 'amber' },
    })
    const tagId = create.json().data.id
    await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId },
    })

    const rename = await app.inject({
      method: 'PATCH',
      url: `/contact-tags/${tagId}`,
      headers: asAuth(testUserId),
      payload: { name: 'New Name', color: 'emerald' },
    })
    expect(rename.statusCode).toBe(200)

    const contactRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    const ref = contactRes.json().data.tagRefs.find((t: any) => t.id === tagId)
    expect(ref.name).toBe('New Name')
    expect(ref.color).toBe('emerald')
    expect(contactRes.json().data.tags).toEqual(['New Name'])
  })
})

describe('assigning and removing tags', () => {
  it('assigning/removing a tag never deletes the catalog entry', async () => {
    const contact = await seedContact()
    const create = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Newsletter' },
    })
    const tagId = create.json().data.id

    await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId },
    })
    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/contacts/${contact.id}/tags/${tagId}`,
      headers: asAuth(testUserId),
    })
    expect(removeRes.statusCode).toBe(200)

    const contactRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(contactRes.json().data.tagRefs).toEqual([])

    const catalog = await app.inject({
      method: 'GET',
      url: '/contact-tags',
      headers: asAuth(testUserId),
    })
    expect(catalog.json().data.some((t: any) => t.id === tagId)).toBe(true)
  })

  it('assigning by name finds-or-creates in one step (the "create new tag inline" path)', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/tags`,
      headers: asAuth(testUserId),
      payload: { name: 'Referral Source' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Referral Source')

    const catalog = await app.inject({
      method: 'GET',
      url: '/contact-tags',
      headers: asAuth(testUserId),
    })
    expect(catalog.json().data.filter((t: any) => t.name === 'Referral Source').length).toBe(1)
  })

  it('cross-tenant tag IDs are rejected', async () => {
    const myContact = await seedContact(testBusinessId)
    const theirTag = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testOtherUserId),
      payload: { name: 'Their Tag' },
    })
    const tagId = theirTag.json().data.id

    const assignRes = await app.inject({
      method: 'POST',
      url: `/contacts/${myContact.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId },
    })
    expect(assignRes.statusCode).toBe(404)
  })

  it('the ongoing tags:string[] write path (Create/UpdateContactInput) round-trips exactly like the legacy JSON array did', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/contacts',
      headers: asAuth(testUserId),
      payload: { name: 'Round Trip Contact', tags: ['Alpha', 'beta', 'Alpha'] },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().data.tags.sort()).toEqual(['Alpha', 'beta'])

    const updated = await app.inject({
      method: 'PATCH',
      url: `/contacts/${created.json().data.id}`,
      headers: asAuth(testUserId),
      payload: { tags: ['beta', 'gamma'] }, // full replace, drops Alpha
    })
    expect(updated.json().data.tags.sort()).toEqual(['beta', 'gamma'])
  })
})

describe('filtering contacts by tag', () => {
  it('has explicit AND ("all") vs OR ("any") semantics, defaulting to AND', async () => {
    const red = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Red' },
    })
    const blue = await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Blue' },
    })
    const redId = red.json().data.id
    const blueId = blue.json().data.id

    const both = await seedContact(testBusinessId, 'Both Tags')
    const redOnly = await seedContact(testBusinessId, 'Red Only')
    const blueOnly = await seedContact(testBusinessId, 'Blue Only')

    await app.inject({
      method: 'POST',
      url: `/contacts/${both.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId: redId },
    })
    await app.inject({
      method: 'POST',
      url: `/contacts/${both.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId: blueId },
    })
    await app.inject({
      method: 'POST',
      url: `/contacts/${redOnly.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId: redId },
    })
    await app.inject({
      method: 'POST',
      url: `/contacts/${blueOnly.id}/tags`,
      headers: asAuth(testUserId),
      payload: { tagId: blueId },
    })

    const andRes = await app.inject({
      method: 'GET',
      url: `/contacts?tagIds=${redId}&tagIds=${blueId}`,
      headers: asAuth(testUserId),
    })
    expect(andRes.json().data.map((c: any) => c.id)).toEqual([both.id])

    const orRes = await app.inject({
      method: 'GET',
      url: `/contacts?tagIds=${redId}&tagIds=${blueId}&tagMode=OR`,
      headers: asAuth(testUserId),
    })
    const orIds = orRes
      .json()
      .data.map((c: any) => c.id)
      .sort()
    expect(orIds).toEqual([blueOnly.id, both.id, redOnly.id].sort())
  })
})

describe('tenant isolation', () => {
  it('a business only ever sees its own tag catalog', async () => {
    await app.inject({
      method: 'POST',
      url: '/contact-tags',
      headers: asAuth(testUserId),
      payload: { name: 'Only Alice Sees This' },
    })
    const bobCatalog = await app.inject({
      method: 'GET',
      url: '/contact-tags',
      headers: asAuth(testOtherUserId),
    })
    expect(bobCatalog.json().data.some((t: any) => t.name === 'Only Alice Sees This')).toBe(false)
  })
})
