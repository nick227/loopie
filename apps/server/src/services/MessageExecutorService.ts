import { db } from '@project/db'
import { MessageService } from './MessageService'

const messageService = new MessageService()

export async function runDueMessages() {
  const due = await db.message.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
  })

  for (const message of due) {
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
