import { db } from '@project/db'

const MAX_COLLISION_ATTEMPTS = 50

export function slugifyPageName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug || 'page'
}

// LandingPage.slug is globally unique. Appends -2, -3, ... on collision with any OTHER page;
// falls back to a short random suffix if every numbered variant up to the attempt cap is also
// taken (pathological, but avoids an unbounded loop).
export async function nextUniqueLandingPageSlug(name: string, excludeLandingPageId: string) {
  const base = slugifyPageName(name)
  let candidate = base
  for (let attempt = 1; attempt <= MAX_COLLISION_ATTEMPTS; attempt++) {
    const clash = await db.landingPage.findFirst({
      where: { slug: candidate, id: { not: excludeLandingPageId } },
    })
    if (!clash) return candidate
    candidate = `${base}-${attempt + 1}`.slice(0, 80)
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 80)
}
