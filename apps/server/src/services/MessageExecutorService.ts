import { db } from '@project/db'
import { MessageService } from './MessageService'

const messageService = new MessageService()

// A claim older than this is treated as abandoned (worker crashed after claiming, before send()
// finished) and safe to retry — mirrors ScheduleSyncTarget's lockToken/lockExpiresAt lease.
const CLAIM_STALE_MS = 10 * 60_000

export async function runDueMessages() {
  const due = await db.message.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
  })

  for (const message of due) {
    // Atomic claim: without this, two overlapping ticks (or a worker restart landing mid-send)
    // could both pass this loop's own snapshot of `due` and both call send() for the same
    // message, actually emailing every recipient twice. Only a row still unclaimed, or claimed
    // long enough ago to be considered abandoned, gets picked up.
    const claimed = await db.message.updateMany({
      where: {
        id: message.id,
        status: 'SCHEDULED',
        OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } }],
      },
      data: { claimedAt: new Date() },
    })
    if (claimed.count === 0) continue

    try {
      await messageService.send(message.businessId, message.id)
    } catch (err) {
      console.error(`[MessageExecutor] Failed to send due message ${message.id}:`, err)
      // Mark as FAILED so it doesn't get retried infinitely if it's a hard error
      await db.message
        .update({
          where: { id: message.id },
          data: { status: 'FAILED' },
        })
        .catch((e) =>
          console.error(
            `[MessageExecutor] Could not update status to FAILED for ${message.id}:`,
            e,
          ),
        )
    }
  }
}
