import { db } from '@project/db'
import { InboxProjectionService } from '../services/InboxProjectionService'

// Page views are the highest-volume event in this codebase — every hosted /p/{slug} render writes
// one, anonymous or not — so this deliberately posts to Inbox only for a visit already
// attributable to a KNOWN contact (one who has submitted a form before, tying their session to a
// Lead's landingSessionId — see identityResolution.ts). A first-ever, still-anonymous visit
// resolves to nothing and posts nothing; that's not a limitation being worked around, it's the
// actual scoping decision (2026-08-28's product direction: "page views tied to known contacts").
//
// Called from LandingPageRenderService.serve(), the public hosted-page render — a hot,
// unauthenticated path. This function is deliberately NOT awaited by its caller (fire-and-forget,
// still wrapped in its own try/catch here) so resolving "is this session known" and posting a
// message can never add latency to a real visitor's page load.
export async function notifyKnownContactPageView(
  businessId: string,
  sessionId: string,
  landingPageId: string,
  landingPageName: string,
) {
  try {
    const lead = await db.lead.findFirst({
      where: { landingSessionId: sessionId },
      select: { contactId: true },
    })
    if (!lead) return // anonymous/unknown visitor — the deliberate no-op case, not an error

    const contact = await db.contact.findUnique({
      where: { id: lead.contactId },
      select: { name: true },
    })
    if (!contact) return

    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'CONTACT', contactId: lead.contactId },
      threadSubject: contact.name,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: 'Page viewed',
      body: `Viewed ${landingPageName}.`,
      meta: { landingPageId },
    })
  } catch (err) {
    console.error('Failed to post Inbox message for page view', err)
  }
}
