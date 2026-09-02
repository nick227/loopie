import { db } from '@project/db'

// The read surface — GET /inbox/threads, GET /inbox/threads/{id}, mark-read. Deliberately narrow
// per the Messages -> Inbox slice (2026-08-28): no archive, no saved/default views, no filters
// beyond all/unread.
//
// The canonical-model question that slice was asked to answer: Message stays canonical. A real
// sent Message's content is never copied into a persisted InboxMessage row — this service reads
// it live via Interaction (the per-recipient pointer MessageService.send() already writes) joined
// back to its Message, every time a thread is listed or opened. Only content with no other source
// of truth (SYSTEM narration — see lib/adRunInbox.ts) is ever a real, persisted InboxMessage row.
// This is the direct way to avoid "Message -> projection -> InboxMessage forever": there is
// exactly one row holding real communication content, so it cannot diverge from itself.
//
// Known, stated limitation: no external email/SMS inbound-reply capture exists yet
// (InteractionType.REPLY is declared, nothing ever writes it). Native BUSINESS threads are the
// exception: their SITE messages and replies are persisted directly as InboxMessage rows.
function toThreadSummaryDTO(
  thread: {
    id: string
    type: string
    subject: string
    contactId: string | null
    advertisementId: string | null
    platform: string | null
    landingPageId: string | null
    integrationPlatform: string | null
    peerBusinessId: string | null
    lastReadAt: Date | null
    createdAt: Date
  },
  preview: { kind: string; body: string | null; at: Date },
) {
  return {
    id: thread.id,
    type: thread.type,
    subject: thread.subject,
    contactId: thread.contactId,
    advertisementId: thread.advertisementId,
    platform: thread.platform,
    landingPageId: thread.landingPageId,
    integrationPlatform: thread.integrationPlatform,
    peerBusinessId: thread.peerBusinessId,
    canReply: thread.type === 'BUSINESS' && thread.peerBusinessId !== null,
    previewKind: preview.kind,
    previewBody: preview.body,
    unread: !thread.lastReadAt || thread.lastReadAt < preview.at,
    lastMessageAt: preview.at.toISOString(),
    createdAt: thread.createdAt.toISOString(),
  }
}

function toMessageDTO(row: {
  id: string
  kind: string
  direction: string
  subject: string | null
  body: string
  createdAt: Date
}) {
  return {
    id: row.id,
    kind: row.kind,
    direction: row.direction,
    subject: row.subject,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }
}

function channelToKind(channel: string): 'EMAIL' | 'SMS' | 'SYSTEM' {
  if (channel === 'TEXT') return 'SMS'
  if (channel === 'EMAIL') return 'EMAIL'
  // SOCIAL is a broadcast post, not a 1:1 conversational message — excluded from Inbox rather
  // than mislabeled as email/SMS. Callers already filter these out before this ever runs.
  return 'SYSTEM'
}

export class InboxService {
  // Most-recent-first, thread-level preview only (no full message list) — a real per-thread N+1
  // (one lookup per CONTACT thread for its latest sent Message), accepted at V1 scale, matching
  // this project's existing precedent for list-view previews elsewhere.
  async list(businessId: string, opts: { filter?: 'all' | 'unread' }) {
    const threads = await db.inboxThread.findMany({
      where: { businessId },
      orderBy: { updatedAt: 'desc' },
    })
    const summaries = await Promise.all(threads.map((t) => this._summarize(t)))
    const filtered = opts.filter === 'unread' ? summaries.filter((s) => s.unread) : summaries
    return { data: filtered }
  }

  async get(businessId: string, threadId: string) {
    const thread = await this._findOwn(businessId, threadId)
    const persisted = await db.inboxMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    })
    let synthesized: ReturnType<typeof toMessageDTO>[] = []
    if (thread.type === 'CONTACT' && thread.contactId) {
      synthesized = await this._contactMessages(thread.contactId)
    }
    const messages = [...persisted.map(toMessageDTO), ...synthesized].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )
    return { thread: toThreadSummaryDTO(thread, await this._preview(thread)), messages }
  }

  async markRead(businessId: string, threadId: string) {
    await this._findOwn(businessId, threadId)
    const updated = await db.inboxThread.update({
      where: { id: threadId },
      data: { lastReadAt: new Date() },
    })
    return toThreadSummaryDTO(updated, await this._preview(updated))
  }

  private async _findOwn(businessId: string, threadId: string) {
    const thread = await db.inboxThread.findFirst({ where: { id: threadId, businessId } })
    if (!thread) throw { statusCode: 404, message: 'Inbox thread not found' }
    return thread
  }

  private async _summarize(thread: Awaited<ReturnType<InboxService['_findOwn']>>) {
    return toThreadSummaryDTO(thread, await this._preview(thread))
  }

  private async _preview(thread: {
    id: string
    type: string
    contactId: string | null
    updatedAt: Date
  }): Promise<{ kind: string; body: string | null; at: Date }> {
    // A CONTACT thread can have BOTH persisted SYSTEM messages (e.g. a Lead stage change — see
    // lib/leadInbox.ts) and live-synthesized real communications (see _contactMessages below) —
    // whichever actually happened most recently must win the preview. Checking only one source
    // (the original bug here) meant a thread whose latest event was a stage change showed a blank
    // preview even though real content existed. ADVERTISEMENT threads only ever have the
    // persisted side, so this reduces to the old behavior for them automatically.
    const persistedLast = await db.inboxMessage.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
    })
    let liveLast: { kind: string; body: string | null; at: Date } | null = null
    if (thread.type === 'CONTACT' && thread.contactId) {
      const last = await db.interaction.findFirst({
        where: {
          contactId: thread.contactId,
          sourceType: 'MESSAGE',
          sourceMessageId: { not: null },
        },
        orderBy: { occurredAt: 'desc' },
        include: { sourceMessage: true },
      })
      if (last?.sourceMessage && last.sourceMessage.channel !== 'SOCIAL') {
        liveLast = {
          kind: channelToKind(last.sourceMessage.channel),
          body: last.sourceMessage.body,
          at: last.occurredAt,
        }
      }
    }
    const candidates = [
      persistedLast
        ? {
            kind: persistedLast.kind as string,
            body: persistedLast.body,
            at: persistedLast.createdAt,
          }
        : null,
      liveLast,
    ].filter((c): c is { kind: string; body: string | null; at: Date } => c !== null)
    if (candidates.length === 0) return { kind: 'SYSTEM', body: null, at: thread.updatedAt }
    return candidates.reduce((a, b) => (b.at > a.at ? b : a))
  }

  private async _contactMessages(contactId: string) {
    const interactions = await db.interaction.findMany({
      where: { contactId, sourceType: 'MESSAGE', sourceMessageId: { not: null } },
      orderBy: { occurredAt: 'asc' },
      include: { sourceMessage: true },
    })
    return interactions
      .filter((row) => row.sourceMessage && row.sourceMessage.channel !== 'SOCIAL')
      .map((row) =>
        toMessageDTO({
          id: row.id,
          kind: channelToKind(row.sourceMessage!.channel),
          direction: 'OUTBOUND',
          subject: row.sourceMessage!.subject,
          body: row.sourceMessage!.body,
          createdAt: row.occurredAt,
        }),
      )
  }
}
