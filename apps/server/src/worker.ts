import { runDueAutomations } from './services/AutomationExecutorService'
import { runDueMessages } from './services/MessageExecutorService'
import { runDuePayouts } from './services/AffiliatePayoutService'
import { runDueAdRunSyncs } from './services/AdRunSyncService'
import { db, cleanupExpiredRateLimitBuckets } from '@project/db'
import { processEmbedOutbox } from './services/activity/EmbedProjectionWorker'

async function main() {
  console.log('Worker started. Initializing pollers...')

  if (process.env.NODE_ENV !== 'test') {
    const intervalMs = Number(process.env.AUTOMATION_POLL_INTERVAL_MS ?? 60_000)
    setInterval(() => {
      runDueAutomations().catch((err) =>
        console.error('[Worker] Error running due automations:', err),
      )
    }, intervalMs)

    const messagePollIntervalMs = Number(process.env.MESSAGE_POLL_INTERVAL_MS ?? 60_000)
    setInterval(() => {
      runDueMessages().catch((err) => console.error('[Worker] Error running due messages:', err))
    }, messagePollIntervalMs)

    const payoutIntervalMs = Number(process.env.AFFILIATE_PAYOUT_POLL_INTERVAL_MS ?? 60 * 60_000)
    setInterval(() => {
      runDuePayouts().catch((err) => console.error('[Worker] Error running due payouts:', err))
    }, payoutIntervalMs)

    const adRunSyncIntervalMs = Number(process.env.AD_RUN_SYNC_POLL_INTERVAL_MS ?? 5 * 60_000)
    setInterval(() => {
      runDueAdRunSyncs().catch((err) =>
        console.error('[Worker] Error running due ad run syncs:', err),
      )
    }, adRunSyncIntervalMs)

    const rateLimitCleanupIntervalMs = Number(
      process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS ?? 10 * 60_000,
    )
    setInterval(() => {
      cleanupExpiredRateLimitBuckets(db).catch((err) =>
        console.error('[Worker] Error cleaning rate limit buckets:', err),
      )
    }, rateLimitCleanupIntervalMs)

    const embedProjectionIntervalMs = Number(process.env.EMBED_PROJECTION_INTERVAL_MS ?? 10_000)
    setInterval(() => {
      processEmbedOutbox().catch((err) =>
        console.error('[Worker] Error processing embed outbox:', err),
      )
    }, embedProjectionIntervalMs)
  }

  const shutdown = async () => {
    console.log('Shutting down worker...')
    await db.$disconnect()
    process.exit(0)
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err)
  process.exit(1)
})
