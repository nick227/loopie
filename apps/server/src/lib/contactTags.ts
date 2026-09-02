import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = PrismaClient | Prisma.TransactionClient

// Small fixed palette, not a raw hex color — a business picks from this set (or one is assigned
// deterministically at creation), mirroring the rotating-Tailwind-class chip pattern already used
// for source/lifecycle badges (apps/web ContactsPage.tsx's SOURCE_STYLES). Keeping the frontend's
// TAG_COLOR_PALETTE in exact sync with this list is a deliberate manual pairing, same as every
// other enum-shaped string this codebase keeps on both sides of the API boundary.
export const TAG_COLOR_PALETTE = [
  'sky',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'pink',
  'slate',
] as const
export type TagColor = (typeof TAG_COLOR_PALETTE)[number]

// Trim + collapse internal whitespace + lowercase — the actual uniqueness key. "VIP", "vip", and
// "  Vip  " all resolve to the same catalog row; `name` keeps whichever casing was used to create
// (or later rename) it.
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function deterministicColor(normalizedName: string): TagColor {
  const sum = Array.from(normalizedName).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return TAG_COLOR_PALETTE[sum % TAG_COLOR_PALETTE.length]!
}

export function toContactTagDTO(tag: {
  id: string
  businessId: string
  name: string
  color: string
  createdAt: Date
}) {
  return {
    id: tag.id,
    businessId: tag.businessId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
  }
}

export function toContactTagRef(tag: { id: string; name: string; color: string }) {
  return { id: tag.id, name: tag.name, color: tag.color }
}

// The one place a ContactTag row is created — used by both the explicit catalog endpoint
// (POST /contact-tags) and the name-based find-or-create path (assigning by name, or the legacy
// tags:string[] convenience field on Create/UpdateContactInput). Racing concurrent creates for
// the same normalized name are resolved by re-reading on a unique-constraint conflict, same
// pattern as LandingPage.slug/Affiliate.referralCode elsewhere in this codebase.
export async function findOrCreateTag(tx: Tx, businessId: string, name: string, color?: string) {
  const normalizedName = normalizeTagName(name)
  if (!normalizedName) throw { statusCode: 400, message: 'Tag name cannot be empty' }

  const existing = await tx.contactTag.findUnique({
    where: { businessId_normalizedName: { businessId, normalizedName } },
  })
  if (existing) return existing

  try {
    return await tx.contactTag.create({
      data: {
        businessId,
        name: name.trim().replace(/\s+/g, ' '),
        normalizedName,
        color:
          color && (TAG_COLOR_PALETTE as readonly string[]).includes(color)
            ? color
            : deterministicColor(normalizedName),
      },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const raced = await tx.contactTag.findUnique({
        where: { businessId_normalizedName: { businessId, normalizedName } },
      })
      if (raced) return raced
    }
    throw err
  }
}

// Full-replace sync — resolves each name to a catalog tag (creating as needed) and makes the
// contact's assignment set exactly match. Used by ContactService.create/update and
// ImportJobService, which all treat `tags: string[]` as "these are now this contact's tags" (the
// same semantics the old JSON array had), not an additive merge.
export async function syncContactTags(
  tx: Tx,
  businessId: string,
  contactId: string,
  names: string[],
) {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  const tags = []
  for (const name of uniqueNames) {
    tags.push(await findOrCreateTag(tx, businessId, name))
  }
  const tagIds = tags.map((t) => t.id)

  await tx.contactTagAssignment.deleteMany({
    where: { contactId, ...(tagIds.length ? { tagId: { notIn: tagIds } } : {}) },
  })
  if (tagIds.length) {
    await tx.contactTagAssignment.createMany({
      data: tagIds.map((tagId) => ({ contactId, tagId })),
      skipDuplicates: true,
    })
  }
}
