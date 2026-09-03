import { absoluteMediaUrl, db } from '@project/db'
import { BusinessService } from '../services/BusinessService'
import { RiverFollowService } from '../services/RiverFollowService'
import { RiverPostService } from '../services/RiverPostService'
import { toRiverFeedItem } from '../services/RiverFeedService'
import { escapeHtml, BASE_PAGE_STYLES } from './riverFeedRender'
import { PUBLIC_SERVER_URL } from './urls'

const businesses = new BusinessService()
const riverFollows = new RiverFollowService()
const riverPosts = new RiverPostService()

type SocialProfileLink = { platform: string; url: string }

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

// The public page is a business front, not a social profile. Its visual hierarchy is artwork,
// name, contact, practical details, and portfolio. River data remains available on River itself.
const PROFILE_STYLES = `
  body { background: #fff; color: #111116; }
  main { max-width: 1080px; margin: 0 auto; }
  .profile-header { display: flex; justify-content: space-between; padding: 0 0 18px; }
  .profile-header a { color: #111116; font-size: 14px; font-weight: 750; text-decoration: none; }
  .hero { position: relative; min-height: 70vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; background: #111116; color: #fff; }
  .hero-art, .hero-wash { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero-wash { filter: blur(24px); transform: scale(1.12); opacity: .35; }
  .hero-shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.04) 45%, rgba(0,0,0,.86)); }
  .hero-top, .hero-copy { position: relative; z-index: 1; padding: 22px; }
  .hero-top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .hero-meta { margin: 0; display: flex; flex-wrap: wrap; gap: 10px 20px; font: 600 10px ui-monospace, monospace; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.82); }
  .hero-logo { width: 56px; height: 56px; object-fit: cover; background: #fff; border: 1px solid rgba(255,255,255,.35); }
  .hero-name { max-width: 11ch; margin: 0; font-size: clamp(56px, 11vw, 120px); font-weight: 850; line-height: .82; letter-spacing: -.075em; }
  .hero-description { max-width: 620px; margin: 28px 0 0; font-size: 17px; line-height: 1.55; color: rgba(255,255,255,.86); }
  .contact-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .contact-action { flex: 1; min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid #ccc; padding: 12px 16px; color: #111116; text-decoration: none; }
  .contact-action:hover { color: #fff; background: #111116; border-color: #111116; }
  .contact-label, .eyebrow { display: block; font: 600 10px ui-monospace, monospace; letter-spacing: .18em; text-transform: uppercase; color: #71717a; }
  .contact-action:hover .contact-label { color: rgba(255,255,255,.65); }
  .contact-value { display: block; margin-top: 3px; font-size: 14px; font-weight: 650; overflow-wrap: anywhere; }
  .details { display: grid; gap: 40px; padding: 64px 0; border-bottom: 1px solid #d4d4d8; }
  .details h2 { max-width: 14ch; margin: 12px 0 0; font-size: clamp(38px, 7vw, 60px); line-height: .96; letter-spacing: -.045em; }
  .facts { margin: 0; border-top: 1px solid #d4d4d8; }
  .fact { display: grid; grid-template-columns: 72px 1fr; gap: 18px; padding: 17px 0; border-bottom: 1px solid #d4d4d8; font-size: 14px; }
  .fact dt { color: #71717a; }
  .fact dd { margin: 0; font-weight: 650; white-space: pre-wrap; }
  .work { padding: 64px 0; }
  .work h2 { margin: 10px 0 24px; font-size: clamp(38px, 7vw, 60px); letter-spacing: -.045em; }
  .gallery-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .gallery-grid img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; }
  .elsewhere { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 20px; border-top: 1px solid #d4d4d8; padding: 28px 0; }
  .elsewhere-links { display: flex; flex-wrap: wrap; gap: 14px 24px; }
  .elsewhere a { color: #111116; font-size: 14px; font-weight: 650; text-underline-offset: 4px; }
  @media (min-width: 640px) {
    .hero-top, .hero-copy { padding: 32px; }
    .contact-actions { flex-direction: row; }
    .details { grid-template-columns: 1fr 1fr; padding: 88px 0; }
    .work { padding: 88px 0; }
    .gallery-grid { grid-template-columns: 1fr 1fr; }
    .gallery-grid img:first-child:nth-last-child(odd) { grid-column: 1 / -1; aspect-ratio: 16/10; }
  }
`

function contactAction(label: string, value: string, href: string) {
  return `<a class="contact-action" href="${escapeHtml(href)}"><span><span class="contact-label">${escapeHtml(label)}</span><span class="contact-value">${escapeHtml(value)}</span></span><span aria-hidden="true">↗</span></a>`
}

export async function renderBusinessProfile(
  slug: string,
  _opts: {
    viewerBusinessId?: string
    viewerSlug?: string | null
    currentUrl: string
    cursor?: string
  },
): Promise<string> {
  const business = await db.business.findUnique({ where: { slug } })
  if (!business) throw { statusCode: 404, message: 'Business not found' }

  const logoUrl = absoluteMediaUrl(business.logoUrl, PUBLIC_SERVER_URL)
  const galleryUrls = ((business.galleryImageUrls as unknown as string[] | null) ?? [])
    .map((url) => absoluteMediaUrl(url, PUBLIC_SERVER_URL))
    .filter((url): url is string => Boolean(url))
  const heroArtwork = galleryUrls[0] ?? null
  const portfolio = heroArtwork ? galleryUrls.slice(1) : galleryUrls
  const socialProfiles = (
    (business.socialProfiles as unknown as SocialProfileLink[] | null) ?? []
  ).filter((row) => row.platform && row.url && isAbsoluteHttpUrl(row.url))

  const heroMedia = heroArtwork
    ? `<img class="hero-art" src="${escapeHtml(heroArtwork)}" alt="Featured work by ${escapeHtml(business.name)}" />`
    : logoUrl
      ? `<img class="hero-wash" src="${escapeHtml(logoUrl)}" alt="" />`
      : ''
  const meta = [business.industry || 'Independent business', business.location]
    .filter(Boolean)
    .map((value) => `<span>${escapeHtml(value)}</span>`)
    .join('')
  const hero = `<section class="hero" aria-labelledby="business-name">
    ${heroMedia}<div class="hero-shade"></div>
    <div class="hero-top"><p class="hero-meta">${meta}</p>${logoUrl ? `<img class="hero-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(business.name)} logo" />` : ''}</div>
    <div class="hero-copy"><h1 class="hero-name" id="business-name">${escapeHtml(business.name)}</h1>${business.description ? `<p class="hero-description">${escapeHtml(business.description)}</p>` : ''}</div>
  </section>`

  const contacts = [
    business.email ? contactAction('Email', business.email, `mailto:${business.email}`) : '',
    business.phone ? contactAction('Call', business.phone, `tel:${business.phone}`) : '',
  ].join('')
  const facts = [
    business.location
      ? `<div class="fact"><dt>Where</dt><dd>${escapeHtml(business.location)}</dd></div>`
      : '',
    business.hours
      ? `<div class="fact"><dt>Hours</dt><dd>${escapeHtml(business.hours)}</dd></div>`
      : '',
    business.industry
      ? `<div class="fact"><dt>Work</dt><dd>${escapeHtml(business.industry)}</dd></div>`
      : '',
  ].join('')
  const details =
    business.targetAudience || facts
      ? `<section class="details"><div><span class="eyebrow">Business</span><h2>${escapeHtml(business.targetAudience ? `Built for ${business.targetAudience}` : business.name)}</h2></div>${facts ? `<dl class="facts">${facts}</dl>` : ''}</section>`
      : ''
  const work = portfolio.length
    ? `<section class="work"><div class="gallery-grid">${portfolio.map((url, index) => `<img src="${escapeHtml(url)}" alt="Work by ${escapeHtml(business.name)}, image ${index + 2}" loading="lazy" />`).join('')}</div></section>`
    : ''
  const elsewhere = socialProfiles.length
    ? `<footer class="elsewhere"><span class="eyebrow">Elsewhere</span><div class="elsewhere-links">${socialProfiles.map((profile) => `<a href="${escapeHtml(profile.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(profile.platform)} ↗</a>`).join('')}</div></footer>`
    : ''
  const title = escapeHtml(business.name)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${escapeHtml(business.description || [business.industry, business.location].filter(Boolean).join(' · ') || business.name)}" />
<style>${BASE_PAGE_STYLES}${PROFILE_STYLES}</style>
</head>
<body>
<main>
  <header class="public-header"><div class="profile-header"><a class="wordmark" href="/">Loopie</a></div></header>
  ${hero}
  ${contacts ? `<section class="contact-actions" aria-label="Contact this business">${contacts}</section>` : ''}
  ${details}
  ${work}
  ${elsewhere}
</main>
</body>
</html>`
}

// The SPA receives business data from this content-negotiated route. The legacy River fields stay
// in the response for API compatibility, but the business page intentionally does not render them.
export async function getBusinessProfileJson(slug: string, opts: { viewerBusinessId?: string }) {
  const business = await db.business.findUnique({ where: { slug } })
  if (!business) throw { statusCode: 404, message: 'Business not found' }

  const isOwnProfile = opts.viewerBusinessId === business.id
  const viewerRecognized = opts.viewerBusinessId !== undefined
  const [businessDTO, followerCount, viewerIsFollowing] = await Promise.all([
    businesses.get(business.id),
    riverFollows.followerCount(business.id),
    viewerRecognized && !isOwnProfile
      ? riverFollows.isFollowing(opts.viewerBusinessId!, business.id)
      : Promise.resolve(false),
  ])

  let featured = null
  if (business.pinnedRiverPostId) {
    try {
      const pinnedCard = await riverPosts.getForRender(
        business.pinnedRiverPostId,
        opts.viewerBusinessId,
      )
      featured = toRiverFeedItem(pinnedCard)
    } catch {
      // A stale pin should not break business data retrieval.
    }
  }

  return {
    business: businessDTO,
    followerCount,
    viewerIsFollowing: viewerRecognized ? viewerIsFollowing : null,
    isOwnProfile,
    featured,
  }
}
