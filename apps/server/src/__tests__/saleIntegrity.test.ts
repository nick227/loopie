// Regression coverage for the money-integrity hardening pass (code review, 2026-08-26): the
// invariant under test throughout is "every business conversion has one canonical identity;
// reports may group it many ways, but no aggregation may count that identity more than once."
// See CLAUDE.md's "Sale & Reporting Integrity" section for the full design.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function createOpenLead(
  overrides: { sourceType?: 'MANUAL' | 'MESSAGE'; sourceMessageId?: string } = {},
) {
  const contact = await db.contact.create({
    data: {
      businessId: testBusinessId,
      name: 'Sale Integrity Contact',
      email: `sic-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
  const lead = await db.lead.create({
    data: {
      businessId: testBusinessId,
      contactId: contact.id,
      sourceType: overrides.sourceType ?? 'MANUAL',
      sourceMessageId: overrides.sourceMessageId,
      openSlot: 'OPEN',
    },
  })
  return { contact, lead }
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Sale Integrity Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'Sale Integrity Form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Sale Integrity Page',
      slug: `sale-integrity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('Sale idempotency', () => {
  it('retrying the same idempotencyKey returns the original sale instead of recording it twice', async () => {
    const { contact, lead } = await createOpenLead()
    const payload = {
      contactId: contact.id,
      leadId: lead.id,
      amount: 1000,
      date: new Date().toISOString(),
      idempotencyKey: 'retry-key-1',
    }

    const first = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload,
    })
    expect(first.statusCode).toBe(201)

    const retry = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload,
    })
    expect(retry.statusCode).toBe(201)
    expect(retry.json().data.id).toBe(first.json().data.id)

    const sales = await db.sale.count({
      where: { businessId: testBusinessId, idempotencyKey: 'retry-key-1' },
    })
    expect(sales).toBe(1)
    // Side effects (the SALE_RECORDED interaction) must not have re-run on the replay either.
    const interactions = await db.interaction.count({
      where: { contactId: contact.id, type: 'SALE_RECORDED' },
    })
    expect(interactions).toBe(1)
  })

  it('two concurrent requests with the same idempotencyKey still produce exactly one sale', async () => {
    const { contact, lead } = await createOpenLead()
    const payload = {
      contactId: contact.id,
      leadId: lead.id,
      amount: 250,
      date: new Date().toISOString(),
      idempotencyKey: 'concurrent-key-1',
    }

    const [a, b] = await Promise.all([
      app.inject({ method: 'POST', url: '/sales', headers: asAuth(testUserId), payload }),
      app.inject({ method: 'POST', url: '/sales', headers: asAuth(testUserId), payload }),
    ])
    expect(a.statusCode).toBe(201)
    expect(b.statusCode).toBe(201)
    expect(a.json().data.id).toBe(b.json().data.id)

    const sales = await db.sale.count({
      where: { businessId: testBusinessId, idempotencyKey: 'concurrent-key-1' },
    })
    expect(sales).toBe(1)
  })
})

describe('Reversed sales excluded from every revenue rollup', () => {
  it('campaign performance, dashboard results, and landing-page performance all stop counting a reversed sale', async () => {
    const page = await createPublishedPage()
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Reversal Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Reversal Campaign',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })
    const deployment = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creative.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    const clickRes = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    const sid = new URL(clickRes.headers.location as string).searchParams.get('sid')!
    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sid,
        idempotencyKey: randomUUID(),
        data: { email: 'reversal@example.com' },
      },
    })
    const { contactId, leadId } = submitRes.json().data

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId,
        leadId,
        amount: 400,
        date: new Date().toISOString(),
        idempotencyKey: 'reversal-rollup-sale',
      },
    })
    const saleId = saleRes.json().data.id

    // Before reversal: revenue shows up everywhere it should.
    const perfBefore = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaign.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(perfBefore.sales).toBe(1)
    expect(perfBefore.revenue).toBe(400)
    const dashBefore = (
      await app.inject({ method: 'GET', url: '/results', headers: asAuth(testUserId) })
    ).json().data
    expect(dashBefore.totalRevenue).toBeGreaterThanOrEqual(400)
    const lpBefore = (
      await app.inject({
        method: 'GET',
        url: `/landing-pages/${page.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(lpBefore.sales).toBe(1)

    const reverseRes = await app.inject({
      method: 'POST',
      url: `/sales/${saleId}/reverse`,
      headers: asAuth(testUserId),
      payload: { reason: 'refund' },
    })
    expect(reverseRes.statusCode).toBe(200)

    const perfAfter = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaign.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(perfAfter.sales).toBe(0)
    expect(perfAfter.revenue).toBe(0)
    const dashAfterRevenue = (
      await app.inject({ method: 'GET', url: '/results', headers: asAuth(testUserId) })
    ).json().data.totalRevenue
    expect(dashAfterRevenue).toBe(Math.max(0, dashBefore.totalRevenue - 400))
    const lpAfter = (
      await app.inject({
        method: 'GET',
        url: `/landing-pages/${page.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(lpAfter.sales).toBe(0)
  })

  it('message performance stops counting a reversed sale', async () => {
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Reversal Audience', type: 'MANUAL_LIST' },
    })
    const message = await db.message.create({
      data: {
        businessId: testBusinessId,
        channel: 'EMAIL',
        body: 'hi',
        audienceId: audience.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    })
    const { contact, lead } = await createOpenLead({
      sourceType: 'MESSAGE',
      sourceMessageId: message.id,
    })

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 150,
        date: new Date().toISOString(),
        idempotencyKey: 'message-reversal-sale',
      },
    })
    const saleId = saleRes.json().data.id

    const before = (
      await app.inject({
        method: 'GET',
        url: `/messages/${message.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(before.sales).toBe(1)
    expect(before.revenue).toBe(150)

    await app.inject({
      method: 'POST',
      url: `/sales/${saleId}/reverse`,
      headers: asAuth(testUserId),
    })

    const after = (
      await app.inject({
        method: 'GET',
        url: `/messages/${message.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(after.sales).toBe(0)
    expect(after.revenue).toBe(0)
  })
})

describe('Conversion counting does not inflate on lead reuse', () => {
  it('a contact with an open lead who converts again through a different deployment does not double the conversion count', async () => {
    const page = await createPublishedPage()
    const creativeA = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Reuse Creative A' },
    })
    const creativeB = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Reuse Creative B' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Reuse Campaign',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creativeA.id }, { creativeId: creativeB.id }] },
      },
    })
    const deploymentA = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creativeA.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })
    const deploymentB = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creativeB.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    const clickA = await app.inject({ method: 'GET', url: `/r/${deploymentA.id}` })
    const sidA = new URL(clickA.headers.location as string).searchParams.get('sid')!
    const submitA = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sidA,
        idempotencyKey: randomUUID(),
        data: { email: 'reuse-conversion@example.com' },
      },
    })
    expect(submitA.statusCode).toBe(201)

    // A fresh session (the contact returns later) clicks a *different* deployment in the same
    // still-running campaign and submits again before ever converting to a Sale.
    const clickB = await app.inject({ method: 'GET', url: `/r/${deploymentB.id}` })
    const sidB = new URL(clickB.headers.location as string).searchParams.get('sid')!
    const submitB = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sidB,
        idempotencyKey: randomUUID(),
        data: { email: 'reuse-conversion@example.com' },
      },
    })
    expect(submitB.statusCode).toBe(201)
    expect(submitB.json().data.leadId).toBe(submitA.json().data.leadId)

    const leadCount = await db.lead.count({
      where: { businessId: testBusinessId, contactId: submitA.json().data.contactId },
    })
    expect(leadCount).toBe(1)

    const updatedA = await db.deployment.findUniqueOrThrow({ where: { id: deploymentA.id } })
    const updatedB = await db.deployment.findUniqueOrThrow({ where: { id: deploymentB.id } })
    expect(updatedA.conversions).toBe(1) // the genuine, original conversion
    expect(updatedB.conversions).toBe(0) // reused the same open lead — not a new conversion
  })
})

describe('Landing-page performance counts distinct leads, not raw submissions', () => {
  it('two submissions from the same still-open lead report 2 submissions but 1 lead', async () => {
    const page = await createPublishedPage()

    const first = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'Repeat.Submitter@example.com' },
      },
    })
    const second = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'repeat.submitter@example.com' },
      },
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(second.json().data.leadId).toBe(first.json().data.leadId)

    const performance = (
      await app.inject({
        method: 'GET',
        url: `/landing-pages/${page.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(performance.submissions).toBe(2)
    expect(performance.leads).toBe(1)
  })
})

describe('Sale reversal is concurrency-safe', () => {
  it('N concurrent reverse calls for the same sale perform exactly one state transition', async () => {
    const { contact, lead } = await createOpenLead()
    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 200,
        date: new Date().toISOString(),
        idempotencyKey: 'concurrent-reverse-sale',
      },
    })
    const saleId = saleRes.json().data.id

    let leadUpdateCount = 0
    db.$use(async (params, next) => {
      if (
        params.model === 'Lead' &&
        params.action === 'update' &&
        params.args?.where?.id === lead.id
      ) {
        leadUpdateCount++
      }
      return next(params)
    })

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: `/sales/${saleId}/reverse`,
          headers: asAuth(testUserId),
          payload: { reason: 'concurrent test' },
        }),
      ),
    )
    for (const res of results) {
      expect(res.statusCode).toBe(200)
      expect(res.json().data.reversedAt).toBeTruthy()
    }
    // Exactly one of the five concurrent requests actually performed the Lead reopen — the rest
    // saw the conditional updateMany return rowCount 0 and skipped straight to returning state.
    expect(leadUpdateCount).toBe(1)

    const finalLead = await db.lead.findUniqueOrThrow({ where: { id: lead.id } })
    expect(finalLead.stage).toBe('INTERESTED')
    expect(finalLead.closedAt).toBeNull()
  })
})

describe('Repeat-purchase policy', () => {
  it('rejects a second sale against an already-closed lead, but allows a new lead or a standalone sale instead', async () => {
    const { contact, lead } = await createOpenLead()
    const first = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 100,
        date: new Date().toISOString(),
        idempotencyKey: 'repeat-first-sale',
      },
    })
    expect(first.statusCode).toBe(201)

    // Reusing the now-closed lead for a second, "repeat purchase" sale is rejected — campaign-
    // attributed revenue must not silently keep crediting the original acquisition indefinitely.
    const reuseAttempt = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 50,
        date: new Date().toISOString(),
        idempotencyKey: 'repeat-second-sale-blocked',
      },
    })
    expect(reuseAttempt.statusCode).toBe(409)
    expect(await db.sale.count({ where: { idempotencyKey: 'repeat-second-sale-blocked' } })).toBe(0)

    // A genuinely new Lead for the repeat purchase is accepted.
    const newLead = await db.lead.create({
      data: { businessId: testBusinessId, contactId: contact.id, sourceType: 'MANUAL' },
    })
    const withNewLead = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: newLead.id,
        amount: 50,
        date: new Date().toISOString(),
        idempotencyKey: 'repeat-second-sale-new-lead',
      },
    })
    expect(withNewLead.statusCode).toBe(201)

    // Omitting leadId entirely (a standalone/LTV sale) is also accepted, unattributed to any campaign.
    const standalone = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        amount: 75,
        date: new Date().toISOString(),
        idempotencyKey: 'repeat-standalone-sale',
      },
    })
    expect(standalone.statusCode).toBe(201)
    expect(standalone.json().data.sourceType).toBe('MANUAL')
    expect(standalone.json().data.leadId).toBeNull()
  })
})
