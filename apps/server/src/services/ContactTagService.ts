import { db } from '@project/db'
import {
  TAG_COLOR_PALETTE,
  findOrCreateTag,
  normalizeTagName,
  toContactTagDTO,
  toContactTagRef,
} from '../lib/contactTags'

async function requireOwnTag(businessId: string, tagId: string) {
  const tag = await db.contactTag.findFirst({ where: { id: tagId, businessId } })
  if (!tag) throw { statusCode: 404, message: 'Tag not found' }
  return tag
}

async function requireOwnContact(businessId: string, contactId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, businessId, deletedAt: null },
  })
  if (!contact) throw { statusCode: 404, message: 'Contact not found' }
  return contact
}

export class ContactTagService {
  // The catalog, for autocomplete and the tag-manager UI — usageCount lets the UI show "used on
  // N contacts" without a second round trip.
  async list(businessId: string, opts: { q?: string } = {}) {
    const tags = await db.contactTag.findMany({
      where: {
        businessId,
        ...(opts.q ? { normalizedName: { contains: normalizeTagName(opts.q) } } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { assignments: true } } },
    })
    return tags.map((tag) => ({ ...toContactTagDTO(tag), usageCount: tag._count.assignments }))
  }

  // Explicit catalog creation — unlike the name-based assign path (findOrCreateTag), a deliberate
  // "create a tag" action against an already-existing name is a real conflict (409), not a silent
  // attach. Same posture as LandingPage.slug/Affiliate.referralCode elsewhere in this codebase.
  async create(businessId: string, data: { name: string; color?: string }) {
    const normalizedName = normalizeTagName(data.name)
    if (!normalizedName) throw { statusCode: 400, message: 'Tag name cannot be empty' }
    const existing = await db.contactTag.findUnique({
      where: { businessId_normalizedName: { businessId, normalizedName } },
    })
    if (existing) throw { statusCode: 409, message: 'A tag with this name already exists' }

    const tag = await db.contactTag.create({
      data: {
        businessId,
        name: data.name.trim().replace(/\s+/g, ' '),
        normalizedName,
        color:
          data.color && (TAG_COLOR_PALETTE as readonly string[]).includes(data.color)
            ? data.color
            : TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)]!,
      },
    })
    return toContactTagDTO(tag)
  }

  // Renaming/recoloring the catalog row — every contact wearing this tag reflects the change
  // implicitly, since the frontend always reads name/color off the catalog row (ContactTagRef),
  // never a copy.
  async update(businessId: string, tagId: string, data: { name?: string; color?: string }) {
    await requireOwnTag(businessId, tagId)
    let normalizedName: string | undefined
    let name: string | undefined
    if (data.name !== undefined) {
      normalizedName = normalizeTagName(data.name)
      if (!normalizedName) throw { statusCode: 400, message: 'Tag name cannot be empty' }
      name = data.name.trim().replace(/\s+/g, ' ')
      const conflict = await db.contactTag.findUnique({
        where: { businessId_normalizedName: { businessId, normalizedName } },
      })
      if (conflict && conflict.id !== tagId) {
        throw { statusCode: 409, message: 'A tag with this name already exists' }
      }
    }
    const tag = await db.contactTag.update({
      where: { id: tagId },
      data: {
        ...(name !== undefined ? { name, normalizedName } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
    })
    return toContactTagDTO(tag)
  }

  // Assigning by tagId requires the tag to already exist and belong to this business (a
  // cross-tenant or nonexistent tagId 404s). Assigning by name is the "create new tag inline"
  // path — find-or-create, so re-assigning an existing name is naturally idempotent rather than a
  // 409 (unlike the explicit `create` above, the intent here is just "make sure this contact has
  // this tag").
  async assign(
    businessId: string,
    contactId: string,
    data: { tagId?: string; name?: string; color?: string },
  ) {
    await requireOwnContact(businessId, contactId)
    let tag
    if (data.tagId) {
      tag = await requireOwnTag(businessId, data.tagId)
    } else if (data.name) {
      tag = await db.$transaction((tx) => findOrCreateTag(tx, businessId, data.name!, data.color))
    } else {
      throw { statusCode: 400, message: 'Either tagId or name is required' }
    }
    await db.contactTagAssignment.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    })
    return toContactTagRef(tag)
  }

  // Removes the assignment only — the catalog row is untouched, same as removing a tag from one
  // email in a mail client doesn't delete the label.
  async unassign(businessId: string, contactId: string, tagId: string) {
    await requireOwnContact(businessId, contactId)
    await requireOwnTag(businessId, tagId)
    await db.contactTagAssignment.deleteMany({ where: { contactId, tagId } })
  }
}
