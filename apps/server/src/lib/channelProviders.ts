import type { Channel, InteractionType, Prisma, PrismaClient } from '@prisma/client'

type Tx = PrismaClient | Prisma.TransactionClient

// Real-world defaults seeded for every new business (see seedChannelProviders) so the catalog is
// useful day one, not empty — "stocked with realistic marketing channels," not hard-coded forever:
// a business can still add its own via findOrCreateProvider. Thin on CALL/EVENT deliberately —
// those rarely have a "product" behind them the way Email/Social/Meeting tools do.
export const DEFAULT_CHANNEL_PROVIDERS: Record<Channel, string[]> = {
  EMAIL: ['Gmail', 'Outlook', 'Mailchimp', 'HubSpot', 'Klaviyo'],
  TEXT: ['Manual', 'Twilio'],
  SOCIAL: ['LinkedIn', 'Instagram', 'Facebook', 'X', 'TikTok', 'LOOPIE River'],
  CALL: ['Phone'],
  MEETING: ['Zoom', 'Google Meet', 'Microsoft Teams', 'In Person'],
  WEBINAR: ['Zoom Webinar', 'YouTube Live', 'ON24'],
  EVENT: ['Trade Show', 'Conference', 'Local Event'],
  FORM: ['LOOPIE Landing Page'],
  REFERRAL: ['Affiliate Program'],
}

// Deterministic InteractionType -> Channel mapping, used both for auto-tagging new interactions
// and for backfilling existing rows. Pipeline/system-of-record types (STATUS_CHANGE,
// SALE_RECORDED, QUOTE_SENT, NOTE) and REPLY (not reliably attributable to a channel from the
// type alone) intentionally map to null — see the Channel enum's own schema comment.
const TYPE_CHANNEL: Partial<Record<InteractionType, Channel>> = {
  EMAIL_SENT: 'EMAIL',
  TEXT_SENT: 'TEXT',
  SOCIAL_POST_SENT: 'SOCIAL',
  CALL_LOGGED: 'CALL',
  MEETING: 'MEETING',
  WEBINAR: 'WEBINAR',
  EVENT: 'EVENT',
  FORM_SUBMITTED: 'FORM',
}

export function channelForInteractionType(type: InteractionType): Channel | null {
  return TYPE_CHANNEL[type] ?? null
}

export function normalizeProviderName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function toChannelProviderDTO(provider: {
  id: string
  businessId: string
  channel: Channel
  name: string
}) {
  return {
    id: provider.id,
    businessId: provider.businessId,
    channel: provider.channel,
    name: provider.name,
  }
}

export function toChannelProviderRef(provider: { id: string; name: string }) {
  return { id: provider.id, name: provider.name }
}

// Same find-or-create-with-race-recovery shape as lib/contactTags.ts#findOrCreateTag — a provider
// is scoped by (businessId, channel, normalizedName), so "Gmail" under EMAIL and a hypothetical
// "Gmail" under some other channel are different rows, not a collision.
export async function findOrCreateProvider(
  tx: Tx,
  businessId: string,
  channel: Channel,
  name: string,
) {
  const normalizedName = normalizeProviderName(name)
  if (!normalizedName) throw { statusCode: 400, message: 'Provider name cannot be empty' }

  const existing = await tx.channelProvider.findUnique({
    where: { businessId_channel_normalizedName: { businessId, channel, normalizedName } },
  })
  if (existing) return existing

  try {
    return await tx.channelProvider.create({
      data: { businessId, channel, name: name.trim().replace(/\s+/g, ' '), normalizedName },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const raced = await tx.channelProvider.findUnique({
        where: { businessId_channel_normalizedName: { businessId, channel, normalizedName } },
      })
      if (raced) return raced
    }
    throw err
  }
}

// Called once at business creation (AuthService.register, inside the same transaction as
// provisionDefaultPage) — see scripts/backfillChannelProviders.ts for the one-time real-data
// backfill this required for businesses that already existed when this slice shipped.
export async function seedChannelProviders(tx: Tx, businessId: string) {
  const rows = Object.entries(DEFAULT_CHANNEL_PROVIDERS).flatMap(([channel, names]) =>
    names.map((name) => ({
      businessId,
      channel: channel as Channel,
      name,
      normalizedName: normalizeProviderName(name),
    })),
  )
  await tx.channelProvider.createMany({ data: rows, skipDuplicates: true })
}
