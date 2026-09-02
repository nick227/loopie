// Filled-in integration test (not a generated stub) for the CRM channel-taxonomy slice —
// Channel -> Provider -> Activity, layered additively onto the existing InteractionType. See
// CLAUDE.md's dated entry for the full design and the real backfill run against the shared dev DB.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact(name = 'Channel Contact') {
  return db.contact.create({
    data: {
      businessId: testBusinessId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
}

describe('ChannelProvider catalog', () => {
  it('the same provider name cannot duplicate within one channel', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testUserId),
      payload: { channel: 'EMAIL', name: 'Constant Contact' },
    })
    expect(first.statusCode).toBe(201)

    const dupe = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testUserId),
      payload: { channel: 'EMAIL', name: 'constant contact' }, // different casing, same normalized key
    })
    expect(dupe.statusCode).toBe(409)
  })

  it('the same name can exist under different channels', async () => {
    const meeting = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testUserId),
      payload: { channel: 'MEETING', name: 'Zoom' },
    })
    expect(meeting.statusCode).toBe(201)

    const webinar = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testUserId),
      payload: { channel: 'WEBINAR', name: 'Zoom' },
    })
    expect(webinar.statusCode).toBe(201)
    expect(meeting.json().data.id).not.toBe(webinar.json().data.id)
  })

  it('renaming a provider updates every interaction referencing it implicitly', async () => {
    const contact = await seedContact()
    const create = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testUserId),
      payload: { channel: 'EMAIL', name: 'Old Tool Name' },
    })
    const providerId = create.json().data.id

    const log = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED', channel: 'EMAIL', providerId },
    })
    expect(log.statusCode).toBe(201)

    await app.inject({
      method: 'PATCH',
      url: `/channel-providers/${providerId}`,
      headers: asAuth(testUserId),
      payload: { name: 'New Tool Name' },
    })

    const timeline = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
    })
    expect(timeline.json().data[0].provider.name).toBe('New Tool Name')
  })

  it('a new business is auto-seeded with real-world default providers', async () => {
    const marker = `channeltest-${Date.now()}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: marker, password: 'password123', businessName: 'Seed Test Co' },
    })
    expect(res.statusCode).toBe(201)
    const businessId = res.json().data.businessId

    const providers = await db.channelProvider.findMany({ where: { businessId } })
    expect(providers.length).toBeGreaterThan(0)
    expect(providers.some((p) => p.channel === 'EMAIL' && p.name === 'Gmail')).toBe(true)
    expect(providers.some((p) => p.channel === 'SOCIAL' && p.name === 'LinkedIn')).toBe(true)
  })
})

describe('logging activity with channel + provider', () => {
  it('auto-derives channel from type when not specified', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED' },
    })
    expect(res.json().data.channel).toBe('CALL')
  })

  it('finds-or-creates a provider by name in one step', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'MEETING', providerName: 'Whereby' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.provider.name).toBe('Whereby')

    const catalog = await app.inject({
      method: 'GET',
      url: '/channel-providers?channel=MEETING',
      headers: asAuth(testUserId),
    })
    expect(catalog.json().data.filter((p: any) => p.name === 'Whereby').length).toBe(1)
  })

  it('rejects a cross-tenant providerId', async () => {
    const myContact = await seedContact()
    const theirs = await app.inject({
      method: 'POST',
      url: '/channel-providers',
      headers: asAuth(testOtherUserId),
      payload: { channel: 'EMAIL', name: 'Their Tool' },
    })
    const providerId = theirs.json().data.id

    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${myContact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'CALL_LOGGED', providerId },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('message send auto-tags channel', () => {
  it("a sent message's interactions carry the message's channel", async () => {
    const contact = await seedContact()
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Channel Test Audience', type: 'MANUAL_LIST' },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })

    const createRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: { channel: 'EMAIL', subject: 'Hi', body: 'Hello there', audienceId: audience.id },
    })
    const messageId = createRes.json().data.id

    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(200)

    const interaction = await db.interaction.findFirst({
      where: { businessId: testBusinessId, contactId: contact.id, type: 'EMAIL_SENT' },
    })
    expect(interaction?.channel).toBe('EMAIL')
  })
})
