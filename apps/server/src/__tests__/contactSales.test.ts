// Filled-in integration test (not a generated stub) for the CRM "sale history" polish slice —
// GET /contacts/{contactId}/sales. See CLAUDE.md's dated entry for the design: the summary must
// reconcile exactly with Contact.revenue (both use ACTIVE_SALE_WHERE), a reversed sale stays
// visible in the list but drops out of the summary, and the list never leaks another contact's
// or another tenant's sales.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact(name = 'Revenue Contact') {
  return db.contact.create({
    data: {
      businessId: testBusinessId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
}

async function seedSale(
  contactId: string,
  overrides: Partial<{ amount: number; date: Date; reversedAt: Date; leadId: string | null }> = {},
) {
  return db.sale.create({
    data: {
      businessId: testBusinessId,
      contactId,
      leadId: overrides.leadId ?? null,
      amount: overrides.amount ?? 100,
      date: overrides.date ?? new Date(),
      sourceType: 'MANUAL',
      reversedAt: overrides.reversedAt ?? null,
      idempotencyKey: `seed-${Math.random().toString(36).slice(2)}`,
    },
  })
}

describe('listContactSales', () => {
  it('returns chronological history (most recent sale date first)', async () => {
    const contact = await seedContact()
    const oldest = await seedSale(contact.id, { amount: 50, date: new Date('2026-01-01') })
    const newest = await seedSale(contact.id, { amount: 75, date: new Date('2026-03-01') })
    const middle = await seedSale(contact.id, { amount: 25, date: new Date('2026-02-01') })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const ids = res.json().data.map((s: any) => s.id)
    expect(ids).toEqual([newest.id, middle.id, oldest.id])
  })

  it('aggregates totalRevenue/saleCount/lastSaleDate identically to Contact.revenue', async () => {
    const contact = await seedContact()
    await seedSale(contact.id, { amount: 100, date: new Date('2026-01-01') })
    await seedSale(contact.id, { amount: 200, date: new Date('2026-02-01') })

    const salesRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    const summary = salesRes.json().summary
    expect(summary.totalRevenue).toBe(300)
    expect(summary.saleCount).toBe(2)
    expect(summary.lastSaleDate).toBe(new Date('2026-02-01').toISOString())

    const contactRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(contactRes.json().data.revenue).toBe(summary.totalRevenue)
  })

  it('a contact with no sales gets a clean empty summary, not an error', async () => {
    const contact = await seedContact()

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toEqual([])
    expect(res.json().summary).toEqual({ totalRevenue: 0, saleCount: 0, lastSaleDate: null })
  })

  it('never leaks another contact’s sales', async () => {
    const contact = await seedContact('Contact A')
    const other = await seedContact('Contact B')
    const mine = await seedSale(contact.id, { amount: 10 })
    await seedSale(other.id, { amount: 999 })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    const ids = res.json().data.map((s: any) => s.id)
    expect(ids).toEqual([mine.id])
    expect(res.json().summary.totalRevenue).toBe(10)
  })

  it('404s across tenants', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testOtherUserId),
    })
    expect(res.statusCode).toBe(404)
  })

  it('a reversed sale stays visible in the list but drops out of the summary, matching Contact.revenue', async () => {
    const contact = await seedContact()
    const active = await seedSale(contact.id, { amount: 100, date: new Date('2026-01-01') })
    const reversed = await seedSale(contact.id, {
      amount: 500,
      date: new Date('2026-06-01'),
      reversedAt: new Date('2026-06-02'),
    })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    const rows = res.json().data
    // Reversed sale still appears, in chronological order, visibly marked.
    expect(rows.map((s: any) => s.id)).toEqual([reversed.id, active.id])
    expect(rows.find((s: any) => s.id === reversed.id).reversedAt).not.toBeNull()
    expect(rows.find((s: any) => s.id === active.id).reversedAt).toBeNull()

    // But the summary — and Contact.revenue, which must reconcile — only count the active sale.
    const summary = res.json().summary
    expect(summary.totalRevenue).toBe(100)
    expect(summary.saleCount).toBe(1)
    expect(summary.lastSaleDate).toBe(new Date('2026-01-01').toISOString())

    const contactRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(contactRes.json().data.revenue).toBe(100)
  })

  it('includes a minimal linked-lead preview when a sale has one', async () => {
    const contact = await seedContact()
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'WON',
      },
    })
    const sale = await seedSale(contact.id, { leadId: lead.id })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/sales`,
      headers: asAuth(testUserId),
    })
    const row = res.json().data.find((s: any) => s.id === sale.id)
    expect(row.lead).toEqual({ id: lead.id, stage: 'WON' })
  })
})
