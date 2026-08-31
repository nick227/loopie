import { db } from '@project/db'
import type { Business } from '@prisma/client'

type SocialProfileLink = { platform: string; url: string }

function toBusinessDTO(business: Business) {
  return {
    id: business.id,
    name: business.name,
    location: business.location,
    industry: business.industry,
    targetAudience: business.targetAudience,
    socialProfiles: (business.socialProfiles as unknown as SocialProfileLink[] | null) ?? [],
    logoUrl: business.logoUrl,
    identityCompletedAt: business.identityCompletedAt?.toISOString() ?? null,
  }
}

export class BusinessService {
  async get(businessId: string) {
    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    return toBusinessDTO(business)
  }

  async update(
    businessId: string,
    data: {
      name?: string
      location?: string | null
      industry?: string | null
      targetAudience?: string | null
      socialProfiles?: SocialProfileLink[]
      logoUrl?: string | null
    },
  ) {
    const existing = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    const business = await db.business.update({
      where: { id: businessId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.industry !== undefined ? { industry: data.industry } : {}),
        ...(data.targetAudience !== undefined ? { targetAudience: data.targetAudience } : {}),
        ...(data.socialProfiles !== undefined ? { socialProfiles: data.socialProfiles } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        // Every successful save counts as "the business has been defined" — setup and a later
        // edit are the same action (see docs/strategy/03-product-principles.md), so this is a
        // one-way stamp, never reset by a subsequent edit.
        identityCompletedAt: existing.identityCompletedAt ?? new Date(),
      },
    })
    return toBusinessDTO(business)
  }
}
