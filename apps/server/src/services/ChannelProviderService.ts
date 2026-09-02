import { db } from '@project/db'
import type { Channel } from '@prisma/client'
import { normalizeProviderName, toChannelProviderDTO } from '../lib/channelProviders'

async function requireOwnProvider(businessId: string, providerId: string) {
  const provider = await db.channelProvider.findFirst({ where: { id: providerId, businessId } })
  if (!provider) throw { statusCode: 404, message: 'Provider not found' }
  return provider
}

export class ChannelProviderService {
  // The catalog for autocomplete/provider management — optionally scoped to one channel (the
  // usual case: picking a provider while logging an activity or composing a message already
  // knows its own channel).
  async list(businessId: string, opts: { channel?: Channel } = {}) {
    const providers = await db.channelProvider.findMany({
      where: { businessId, ...(opts.channel ? { channel: opts.channel } : {}) },
      orderBy: [{ channel: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { interactions: true } } },
    })
    return providers.map((p) => ({ ...toChannelProviderDTO(p), usageCount: p._count.interactions }))
  }

  // Explicit catalog creation — a deliberate "add a provider" action against an already-existing
  // name is a real conflict (409), same posture as ContactTagService.create. The silent
  // find-or-create path (findOrCreateProvider) is for logging activity/sending messages, where
  // re-using an existing name should just work, not error.
  async create(businessId: string, data: { channel: Channel; name: string }) {
    const normalizedName = normalizeProviderName(data.name)
    if (!normalizedName) throw { statusCode: 400, message: 'Provider name cannot be empty' }
    const existing = await db.channelProvider.findUnique({
      where: {
        businessId_channel_normalizedName: { businessId, channel: data.channel, normalizedName },
      },
    })
    if (existing)
      throw { statusCode: 409, message: 'A provider with this name already exists on this channel' }

    const provider = await db.channelProvider.create({
      data: {
        businessId,
        channel: data.channel,
        name: data.name.trim().replace(/\s+/g, ' '),
        normalizedName,
      },
    })
    return toChannelProviderDTO(provider)
  }

  // Renaming the catalog row — every interaction referencing it (via providerId) reflects the
  // change implicitly, same as ContactTagService.update. Channel is immutable once created (not
  // in the accepted field list) — a provider genuinely belongs to one channel.
  async update(businessId: string, providerId: string, data: { name: string }) {
    const current = await requireOwnProvider(businessId, providerId)
    const normalizedName = normalizeProviderName(data.name)
    if (!normalizedName) throw { statusCode: 400, message: 'Provider name cannot be empty' }
    const conflict = await db.channelProvider.findUnique({
      where: {
        businessId_channel_normalizedName: { businessId, channel: current.channel, normalizedName },
      },
    })
    if (conflict && conflict.id !== providerId) {
      throw { statusCode: 409, message: 'A provider with this name already exists on this channel' }
    }
    const provider = await db.channelProvider.update({
      where: { id: providerId },
      data: { name: data.name.trim().replace(/\s+/g, ' '), normalizedName },
    })
    return toChannelProviderDTO(provider)
  }
}
