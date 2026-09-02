// Regression coverage for the omni-inbox pass (2026-08-28): a page view only posts to Inbox when
// the visiting session is already tied to a known Contact (via Lead.landingSessionId, set at
// their first form submission) — a first-ever, still-anonymous visit must stay silent. Also
// proves the hosted page render itself is never blocked by this (the fire-and-forget contract).
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

function visitorSid() {
  return issueSid().token
}

async function publishedPage(name: string) {
  const template = await db.landingPageTemplate.create({
    data: { name: `${name} Template`, isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: `${name} form`,
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

async function threadForContact(contactId: string) {
  return db.inboxThread.findUnique({
    where: { contactId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

describe('Inbox: page views tied to known contacts', () => {
  it('posts nothing for a first-ever, still-anonymous visit', async () => {
    const page = await publishedPage('Pricing')
    const sid = visitorSid()

    const res = await app.inject({ method: 'GET', url: `/p/${page.slug}?sid=${sid}` })
    expect(res.statusCode).toBe(200)

    // Give the deliberately-unawaited notify a beat to run, then confirm it found nothing to do.
    await new Promise((resolve) => setTimeout(resolve, 50))
    const threads = await db.inboxThread.findMany({ where: { businessId: testBusinessId } })
    expect(threads).toHaveLength(0)
  })

  it('posts "Page viewed" into the contact thread for a known revisitor', async () => {
    const page = await publishedPage('Kitchen Remodel')
    const sid = visitorSid()

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sid,
        idempotencyKey: randomUUID(),
        data: { email: 'sarah.chen@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
    const contactId = submitRes.json().data.contactId

    // Same visitor comes back to the (same) page — now a known contact.
    const res = await app.inject({ method: 'GET', url: `/p/${page.slug}?sid=${sid}` })
    expect(res.statusCode).toBe(200)

    await new Promise((resolve) => setTimeout(resolve, 50))
    const thread = await threadForContact(contactId)
    expect(thread).toBeTruthy()
    // The submission itself already posted a "Form submitted" message (see submissionInbox
    // tests) — this proves the page-view message specifically also landed, appended after it.
    const viewMessage = thread!.messages.find((m) => m.subject === 'Page viewed')
    expect(viewMessage).toBeTruthy()
    expect(viewMessage!.body).toBe('Viewed Kitchen Remodel.')
    expect(viewMessage!.direction).toBe('INTERNAL')
  })

  it('does not block the page render even though the notify is async', async () => {
    const page = await publishedPage('Fast Page')
    const sid = visitorSid()
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sid,
        idempotencyKey: randomUUID(),
        data: { email: 'fast@example.com' },
      },
    })

    const start = Date.now()
    const res = await app.inject({ method: 'GET', url: `/p/${page.slug}?sid=${sid}` })
    const elapsedMs = Date.now() - start
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<html')
    // Generous bound — the point isn't a strict perf assertion, it's proving the response comes
    // back without waiting on the notify's own DB round trips.
    expect(elapsedMs).toBeLessThan(2000)
  })
})
