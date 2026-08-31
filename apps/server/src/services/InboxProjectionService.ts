import { db } from '@project/db'
import type { Prisma, InboxMessageKind, InboxMessageDirection } from '@prisma/client'

// The curated, user-facing projection — deliberately separate from the concurrent session's
// ActivityProjectionService (a comprehensive internal audit trail) per the product decision
// recorded 2026-08-28: not every event deserves an Inbox item, and Inbox messages need their own
// human-authored subject/body per event type rather than a generic "here's the row" snapshot.
//
// Threads are polymorphic by design (revised 2026-08-28, before any real data existed — see
// InboxThread's own schema doc comment): Inbox owns the thread, a Contact/Advertisement/
// LandingPage/integration platform attaches to it, never the other way around. All four kinds are
// real and wired as of the "omni inbox" pass (2026-08-28) — see lib/adRunInbox.ts (ADVERTISEMENT),
// lib/leadInbox.ts (CONTACT, stage changes), lib/submissionInbox.ts (CONTACT + PAGE, one
// submission event legitimately projected into both — contextual projection, not duplication),
// lib/pageViewInbox.ts (CONTACT, known-visitor page views), and lib/integrationInbox.ts
// (INTEGRATION, connect/disconnect — NOT automatic failure detection, which doesn't exist
// anywhere in this codebase; see that file's own doc comment).
export type InboxThreadIdentity =
  | { type: 'ADVERTISEMENT'; advertisementId: string; platform: string }
  | { type: 'CONTACT'; contactId: string }
  | { type: 'PAGE'; landingPageId: string }
  | { type: 'INTEGRATION'; integrationPlatform: string }

export class InboxProjectionService {
  // Finds or creates the one thread for this identity, then appends a message. Callers are
  // expected to wrap this in their own try/catch (see lib/adRunInbox.ts's notifyAdRunEvent) — this
  // never throws on its own initiative beyond genuine DB failures, and posting an Inbox message
  // must never be able to fail the mutation that triggered it.
  static async postMessage(input: {
    businessId: string
    thread: InboxThreadIdentity
    threadSubject: string
    kind: InboxMessageKind
    direction: InboxMessageDirection
    messageSubject?: string
    body: string
    meta?: Record<string, unknown>
  }) {
    const thread = await this._findOrCreateThread(
      input.businessId,
      input.thread,
      input.threadSubject,
    )

    return db.inboxMessage.create({
      data: {
        threadId: thread.id,
        kind: input.kind,
        direction: input.direction,
        subject: input.messageSubject,
        body: input.body,
        meta: input.meta as Prisma.InputJsonValue | undefined,
      },
    })
  }

  private static async _findOrCreateThread(
    businessId: string,
    identity: InboxThreadIdentity,
    subject: string,
  ) {
    switch (identity.type) {
      case 'ADVERTISEMENT':
        return db.inboxThread.upsert({
          where: {
            advertisementId_platform: {
              advertisementId: identity.advertisementId,
              platform: identity.platform,
            },
          },
          update: {},
          create: {
            businessId,
            type: 'ADVERTISEMENT',
            advertisementId: identity.advertisementId,
            platform: identity.platform,
            subject,
          },
        })
      case 'CONTACT':
        return db.inboxThread.upsert({
          where: { contactId: identity.contactId },
          update: {},
          create: { businessId, type: 'CONTACT', contactId: identity.contactId, subject },
        })
      case 'PAGE':
        return db.inboxThread.upsert({
          where: { landingPageId: identity.landingPageId },
          update: {},
          create: { businessId, type: 'PAGE', landingPageId: identity.landingPageId, subject },
        })
      case 'INTEGRATION':
        return db.inboxThread.upsert({
          where: {
            businessId_integrationPlatform: {
              businessId,
              integrationPlatform: identity.integrationPlatform,
            },
          },
          update: {},
          create: {
            businessId,
            type: 'INTEGRATION',
            integrationPlatform: identity.integrationPlatform,
            subject,
          },
        })
    }
  }
}
