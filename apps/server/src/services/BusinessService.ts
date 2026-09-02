import { db } from '@project/db'
import type { Business } from '@prisma/client'
import { publicBusinessProfileUrl } from '../lib/urls'

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
    // Slice 5 — the profile's expanded About/contact section + gallery. See the schema's own
    // comment: freeform, no controlled vocabulary, no join table.
    description: business.description,
    phone: business.phone,
    email: business.email,
    hours: business.hours,
    galleryImageUrls: (business.galleryImageUrls as unknown as string[] | null) ?? [],
    identityCompletedAt: business.identityCompletedAt?.toISOString() ?? null,
    // Both null only for a pre-2026-09-01 row that hasn't been backfilled yet — see
    // scripts/backfillBusinessSlugs.ts. Every business created after that gets one at
    // registration (AuthService.register).
    slug: business.slug,
    publicProfileUrl: business.slug ? publicBusinessProfileUrl(business.slug) : null,
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
      description?: string | null
      phone?: string | null
      email?: string | null
      hours?: string | null
      galleryImageUrls?: string[]
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
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.hours !== undefined ? { hours: data.hours } : {}),
        ...(data.galleryImageUrls !== undefined ? { galleryImageUrls: data.galleryImageUrls } : {}),
        // Every successful save counts as "the business has been defined" — setup and a later
        // edit are the same action (see docs/strategy/03-product-principles.md), so this is a
        // one-way stamp, never reset by a subsequent edit.
        identityCompletedAt: existing.identityCompletedAt ?? new Date(),
      },
    })
    return toBusinessDTO(business)
  }
}
