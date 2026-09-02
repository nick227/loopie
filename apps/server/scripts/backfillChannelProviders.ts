// One-time backfill for the CRM channel-taxonomy slice (see CLAUDE.md's dated entry):
// 1. Seeds the real-world default ChannelProvider catalog for every business that already existed
//    before this slice shipped (new businesses get this automatically via AuthService.register).
// 2. Backfills Interaction.channel on existing rows where it's deterministically derivable from
//    `type` (see lib/channelProviders.ts#channelForInteractionType). providerId is never
//    backfilled — no historical data indicates which real-world tool was used, and leaving it
//    null is an honest "unknown," not a guess.
//
// Usage: DATABASE_URL=... pnpm --filter server exec tsx scripts/backfillChannelProviders.ts
import { db } from '@project/db'
import { seedChannelProviders } from '../src/lib/channelProviders'

async function main() {
  const businesses = await db.business.findMany({ select: { id: true } })
  for (const business of businesses) {
    await seedChannelProviders(db, business.id)
  }
  const providerCount = await db.channelProvider.count()

  const TYPE_CHANNEL: Record<string, string> = {
    EMAIL_SENT: 'EMAIL',
    TEXT_SENT: 'TEXT',
    SOCIAL_POST_SENT: 'SOCIAL',
    CALL_LOGGED: 'CALL',
    MEETING: 'MEETING',
    WEBINAR: 'WEBINAR',
    EVENT: 'EVENT',
    FORM_SUBMITTED: 'FORM',
  }

  let updated = 0
  for (const [type, channel] of Object.entries(TYPE_CHANNEL)) {
    const result = await db.interaction.updateMany({
      where: { type: type as any, channel: null },
      data: { channel: channel as any },
    })
    updated += result.count
  }

  console.log(
    [
      `Businesses processed: ${businesses.length}`,
      `ChannelProvider rows now in the catalog (across all businesses): ${providerCount}`,
      `Interaction rows backfilled with a derived channel: ${updated}`,
    ].join('\n'),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
