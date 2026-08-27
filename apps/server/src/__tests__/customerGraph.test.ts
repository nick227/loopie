import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: { name: 'CRM Graph Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'CRM Form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'CRM Page',
      slug: `crm-graph-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId: formRes.json().data.id,
    },
  })
  const page = pageRes.json().data
  await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(testUserId),
  })
  return page
}

describe('CRM customer graph', () => {
  it('form then Shopify-shaped upsert links to the same Contact', async () => {
    const page = await createPublishedPage()
    const sid = (
      await app.inject({ method: 'GET', url: `/t/session?businessId=${testBusinessId}` })
    ).json().data.token
    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'sarah.graph@example.com' } },
    })
    expect(submit.statusCode).toBe(201)
    const contactId = submit.json().data.contactId

    const integration = (
      await app.inject({
        method: 'POST',
        url: '/integrations',
        headers: asAuth(testUserId),
        payload: { provider: 'SHOPIFY', externalAccountId: 'shop-form-first' },
      })
    ).json().data

    const ingest = await app.inject({
      method: 'POST',
      url: '/external-events',
      headers: asAuth(testUserId),
      payload: {
        integrationId: integration.id,
        type: 'CONTACT_CREATED',
        externalEventId: 'cust_1',
        contact: { externalId: 'cust_1', name: 'Sarah Miller', email: 'sarah.graph@example.com' },
      },
    })
    expect(ingest.statusCode).toBe(201)
    expect(ingest.json().data.contactId).toBe(contactId)
    expect(
      await db.contact.count({
        where: { businessId: testBusinessId, email: 'sarah.graph@example.com' },
      }),
    ).toBe(1)
  })

  it('Shopify then form reuses the imported Contact', async () => {
    const page = await createPublishedPage()
    const integration = (
      await app.inject({
        method: 'POST',
        url: '/integrations',
        headers: asAuth(testUserId),
        payload: { provider: 'SHOPIFY', externalAccountId: 'shop-shop-first' },
      })
    ).json().data
    const ingest = await app.inject({
      method: 'POST',
      url: '/external-events',
      headers: asAuth(testUserId),
      payload: {
        integrationId: integration.id,
        type: 'CONTACT_CREATED',
        externalEventId: 'cust_2',
        contact: { externalId: 'cust_2', name: 'Jordan Lee', email: 'jordan.graph@example.com' },
      },
    })
    expect(ingest.statusCode).toBe(201)
    const importedId = ingest.json().data.contactId

    const sid = (
      await app.inject({ method: 'GET', url: `/t/session?businessId=${testBusinessId}` })
    ).json().data.token
    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'jordan.graph@example.com' } },
    })
    expect(submit.statusCode).toBe(201)
    expect(submit.json().data.contactId).toBe(importedId)
  })

  it('email and phone hitting different contacts is flagged, not merged', async () => {
    await db.contact.create({
      data: { businessId: testBusinessId, name: 'A', email: 'split-a@example.com' },
    })
    await db.contact.create({ data: { businessId: testBusinessId, name: 'B', phone: '555-0100' } })
    const imported = await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: { contacts: [{ name: 'Split', email: 'split-a@example.com', phone: '555-0100' }] },
    })
    expect(imported.statusCode).toBe(200)
    expect(imported.json().data.ambiguous).toBe(1)
    expect(imported.json().data.created).toBe(0)
    const matches = await app.inject({
      method: 'GET',
      url: '/contact-matches',
      headers: asAuth(testUserId),
    })
    expect(
      matches.json().data.some((r: { matchStatus: string }) => r.matchStatus === 'AMBIGUOUS'),
    ).toBe(true)
  })

  it('CSV import is idempotent by email and links instead of skipping', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: { contacts: [{ name: 'Csv One', email: 'csv-idem@example.com' }] },
    })
    expect(first.json().data.created).toBe(1)
    const second = await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: { contacts: [{ name: 'Csv One', email: 'csv-idem@example.com' }] },
    })
    expect(second.json().data.linked).toBe(1)
    expect(second.json().data.created).toBe(0)
    expect(
      await db.contact.count({
        where: { businessId: testBusinessId, email: 'csv-idem@example.com' },
      }),
    ).toBe(1)
  })

  it('import maps firstName JSON and keeps CRM profile fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: {
        contacts: [
          {
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada.import@example.com',
            jobTitle: 'Engineer',
            city: 'London',
            profile: { lifecycle_stage: 'customer' },
          },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.created).toBe(1)
    const contact = await db.contact.findFirst({
      where: { businessId: testBusinessId, email: 'ada.import@example.com' },
    })
    expect(contact?.name).toBe('Ada Lovelace')
    const got = await app.inject({
      method: 'GET',
      url: `/contacts/${contact!.id}`,
      headers: asAuth(testUserId),
    })
    expect(got.json().data.records[0].profile).toMatchObject({
      jobTitle: 'Engineer',
      city: 'London',
      lifecycle_stage: 'customer',
    })
  })

  it('import does not overwrite consent on a linked person', async () => {
    await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: {
        contacts: [{ name: 'Pat', email: 'pat.consent@example.com', emailEligible: true }],
      },
    })
    await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      payload: {
        contacts: [{ name: 'Pat', email: 'pat.consent@example.com', emailEligible: false }],
      },
    })
    const contact = await db.contact.findFirst({
      where: { businessId: testBusinessId, email: 'pat.consent@example.com' },
    })
    expect(contact?.emailEligible).toBe(true)
  })

  it('order.created attaches a Sale to an open attributed Lead and rolls into campaign performance', async () => {
    const page = await createPublishedPage()
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'CRM Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'CRM Campaign',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })
    const advertisement = await db.advertisement.create({
      data: { businessId: testBusinessId, name: 'CRM Ad' },
    })
    const adRun = await db.adRun.create({
      data: {
        advertisementId: advertisement.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })
    await db.campaignAdRun.create({ data: { campaignId: campaign.id, adRunId: adRun.id } })

    const click = await app.inject({ method: 'GET', url: `/r/adrun/${adRun.id}` })
    const sid = new URL(click.headers.location as string).searchParams.get('sid')!
    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'buyer.graph@example.com' } },
    })
    expect(submit.statusCode).toBe(201)
    const { contactId, leadId } = submit.json().data

    const integration = (
      await app.inject({
        method: 'POST',
        url: '/integrations',
        headers: asAuth(testUserId),
        payload: { provider: 'SHOPIFY', externalAccountId: 'shop-order' },
      })
    ).json().data

    const event = await app.inject({
      method: 'POST',
      url: '/external-events',
      headers: asAuth(testUserId),
      payload: {
        integrationId: integration.id,
        type: 'ORDER_CREATED',
        externalEventId: 'order_229',
        amount: 229,
        contact: { externalId: 'cust_buyer', email: 'buyer.graph@example.com', name: 'Buyer' },
      },
    })
    expect(event.statusCode).toBe(201)
    expect(event.json().data.contactId).toBe(contactId)
    expect(event.json().data.saleId).toBeTruthy()

    const sale = await db.sale.findFirstOrThrow({ where: { id: event.json().data.saleId } })
    expect(sale.leadId).toBe(leadId)
    expect(sale.sourceType).toBe('AD_RUN')
    expect(sale.sourceAdRunId).toBe(adRun.id)

    const perf = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaign.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(perf.sales).toBe(1)
    expect(perf.revenue).toBe(229)
  })
})
