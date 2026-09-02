import { db } from '@project/db'
import type { Prisma } from '@prisma/client'

const MAX_COLLISION_ATTEMPTS = 50

export function slugifyBusinessName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug || 'business'
}

// Business.slug is globally unique, same collision policy as
// lib/landingPageSlug.ts#nextUniqueLandingPageSlug: append -2, -3, ... on clash, fall back to a
// short random suffix if every numbered variant up to the attempt cap is also taken. Accepts a
// transaction client so AuthService.register can reserve the slug inside the same transaction
// that creates the Business row.
export async function nextUniqueBusinessSlug(
  client: Prisma.TransactionClient | typeof db,
  name: string,
) {
  const base = slugifyBusinessName(name)
  let candidate = base
  for (let attempt = 1; attempt <= MAX_COLLISION_ATTEMPTS; attempt++) {
    const clash = await client.business.findUnique({ where: { slug: candidate } })
    if (!clash) return candidate
    candidate = `${base}-${attempt + 1}`.slice(0, 80)
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 80)
}
