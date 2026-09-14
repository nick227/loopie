import { runDueAutomations } from './services/AutomationExecutorService'
import { runDueMessages } from './services/MessageExecutorService'
import { runDuePayouts } from './services/AffiliatePayoutService'
import { runDuePlatformEarningPromotions } from './services/PlatformEarningClearingService'
import { runDueAdRunSyncs } from './services/AdRunSyncService'
import { db, cleanupExpiredRateLimitBuckets } from '@project/db'
import { processEmbedOutbox } from './services/activity/EmbedProjectionWorker'
import { runDueGoalReminders } from './services/CalendarReminderService'
import { runDueScheduleSyncs } from './services/ScheduleSyncService'
import { schedulePoller } from './lib/workerHeartbeat'

function main() {
  console.log('Worker started. Initializing pollers...')

  if (process.env.NODE_ENV !== 'test') {
    schedulePoller(
      'automations',
      Number(process.env.AUTOMATION_POLL_INTERVAL_MS ?? 60_000),
      runDueAutomations,
    )

    schedulePoller(
      'messages',
      Number(process.env.MESSAGE_POLL_INTERVAL_MS ?? 60_000),
      runDueMessages,
    )

    schedulePoller(
      'affiliate-payouts',
      Number(process.env.AFFILIATE_PAYOUT_POLL_INTERVAL_MS ?? 60 * 60_000),
      runDuePayouts,
    )

    schedulePoller(
      'platform-earning-clearing',
      Number(process.env.PLATFORM_EARNING_CLEARING_POLL_INTERVAL_MS ?? 60 * 60_000),
      runDuePlatformEarningPromotions,
    )

    schedulePoller(
      'ad-run-sync',
      Number(process.env.AD_RUN_SYNC_POLL_INTERVAL_MS ?? 5 * 60_000),
      runDueAdRunSyncs,
    )

    schedulePoller(
      'rate-limit-cleanup',
      Number(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS ?? 10 * 60_000),
      () => cleanupExpiredRateLimitBuckets(db),
    )

    schedulePoller(
      'embed-projection',
      Number(process.env.EMBED_PROJECTION_INTERVAL_MS ?? 10_000),
      processEmbedOutbox,
    )

    schedulePoller(
      'calendar-reminders',
      Number(process.env.CALENDAR_REMINDER_POLL_INTERVAL_MS ?? 60_000),
      runDueGoalReminders,
    )

    // page-thumbnails deliberately does NOT run here. PageThumbnailService writes real files to
    // local disk (UPLOAD_DIR) via a Railway volume mounted on the `server` service specifically —
    // Railway volumes are per-service, not shared, so a separate worker process would write
    // thumbnails to a filesystem the actual HTTP server serving /uploads can never see (a row
    // marked READY whose file 404s — worse than the pre-fix "Preview unavailable" state, not
    // better). It keeps running inside apps/server/src/index.ts instead, alongside the boot-time
    // ensureDefaultThumbnails() call, where the volume is actually mounted.

    schedulePoller(
      'schedule-sync',
      Number(process.env.SCHEDULE_SYNC_POLL_INTERVAL_MS ?? 2 * 60_000),
      runDueScheduleSyncs,
    )
  }

  const shutdown = async () => {
    console.log('Shutting down worker...')
    await db.$disconnect()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())
}

main()
