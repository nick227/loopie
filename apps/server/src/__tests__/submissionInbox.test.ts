// Regression coverage for contextual projection (2026-08-28): one real form submission is one
// canonical event, posted into BOTH the contact's thread and the page's thread — not duplication
// in the bad sense (see InboxProjectionService's own doc comment), each is a different sentence
// about the same FormSubmission.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function publishedPage(name: string, formName: string) {
  const template = await db.landingPageTemplate.create({
    data: { name: `${name} Template`, isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: formName,
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

describe('Inbox: one form submission projects into both the contact and page threads', () => {
  it('posts "New lead" into the contact thread and "New submission" into the page thread', async () => {
    const page = await publishedPage('Kitchen Remodel', 'Consultation Request')

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'marcus.hill@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
    const contactId = submitRes.json().data.contactId
    // The test form only has an email field, so identity resolution falls back to its default
    // display name ("Website visitor") — real submissions with a name field would use that name.
    const contact = await db.contact.findUniqueOrThrow({ where: { id: contactId } })
    expect(contact.name).toBe('Website visitor')

    const contactThread = await db.inboxThread.findUnique({
      where: { contactId },
      include: { messages: true },
    })
    expect(contactThread).toBeTruthy()
    expect(contactThread!.type).toBe('CONTACT')
    // A first-time submission creates a brand new Lead, so the contact-thread projection uses
    // the "New lead" phrasing (see lib/submissionInbox.ts's leadCreated branch), not "Form
    // submitted" — that phrasing is reserved for a repeat submission against an already-open Lead.
    const contactMsg = contactThread!.messages.find((m) => m.subject === 'New lead')
    expect(contactMsg).toBeTruthy()
    expect(contactMsg!.body).toBe('New lead from Kitchen Remodel.')

    const pageThread = await db.inboxThread.findUnique({
      where: { landingPageId: page.id },
      include: { messages: true },
    })
    expect(pageThread).toBeTruthy()
    expect(pageThread!.type).toBe('PAGE')
    expect(pageThread!.subject).toBe('Kitchen Remodel')
    const pageMsg = pageThread!.messages.find((m) => m.subject === 'New submission')
    expect(pageMsg).toBeTruthy()
    expect(pageMsg!.body).toBe(`New submission from ${contact.name}.`)
  })

  it('accumulates one PAGE-thread message per submission across different contacts', async () => {
    const page = await publishedPage('Roofing Estimate', 'Get a Quote')

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'first@example.com' },
      },
    })
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'second@example.com' },
      },
    })

    const pageThread = await db.inboxThread.findUnique({
      where: { landingPageId: page.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    expect(pageThread!.messages).toHaveLength(2)
  })

  it('reuses the same PAGE thread across submissions rather than creating a new one each time', async () => {
    const page = await publishedPage('Bath Remodel', 'Free Estimate')

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'one@example.com' },
      },
    })
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'two@example.com' },
      },
    })

    const pageThreads = await db.inboxThread.findMany({ where: { landingPageId: page.id } })
    expect(pageThreads).toHaveLength(1)
  })
})
