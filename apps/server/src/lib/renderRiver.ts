import { PUBLIC_BASE_URL } from './urls'
import type { RiverFeedCard } from '../services/RiverPostService'
import {
  escapeHtml,
  BASE_PAGE_STYLES,
  CARD_FEED_STYLES,
  renderCard,
  feedScript,
} from './riverFeedRender'
import { renderPublicHeader, PUBLIC_CHROME_STYLES } from './publicChrome'

// River-page-only chrome (own width, Following/Latest tabs) — the card/feed styles themselves
// live in riverFeedRender.ts, shared with the business-profile page's embedded feed section; the
// header itself lives in publicChrome.ts, shared the same way (slice 5).
const RIVER_PAGE_STYLES = `
  main { max-width: 720px; margin: 0 auto; }
  .feed-tabs { margin: -12px 0 20px; font-size: 13px; }
  .feed-tabs a { color: #6b6b64; text-decoration: none; font-weight: 600; margin-right: 14px; }
  .feed-tabs a.active { color: #1c1c1a; }
`

function page(title: string, headerHtml: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${BASE_PAGE_STYLES}${PUBLIC_CHROME_STYLES}${CARD_FEED_STYLES}${RIVER_PAGE_STYLES}</style>
</head>
<body>
<main>
  ${headerHtml}
  ${body}
</main>
</body>
</html>`
}

export function renderRiverFeed(
  cards: RiverFeedCard[],
  nextCursor: string | null,
  opts: {
    currentUrl: string
    following: boolean
    viewerRecognized: boolean
    viewerBusinessId?: string
    viewerSlug?: string | null
  },
): string {
  const cardsHtml = cards.length
    ? cards.map((card, i) => renderCard(card, opts.currentUrl, i + 1)).join('')
    : `<div class="empty">No posts yet.</div>`
  const more = nextCursor
    ? `<a class="more" href="${escapeHtml(
        `${PUBLIC_BASE_URL}/river?cursor=${encodeURIComponent(nextCursor)}${opts.following ? '&following=1' : ''}`,
      )}">More</a>`
    : ''
  // Following/Latest tabs only for a recognized viewer — see doc 02's suggested tabs, minus "For
  // You" (no ranking work this slice).
  const tabs = opts.viewerRecognized
    ? `<nav class="feed-tabs">
        <a href="${escapeHtml(`${PUBLIC_BASE_URL}/river`)}" class="${opts.following ? '' : 'active'}">Latest</a>
        <a href="${escapeHtml(`${PUBLIC_BASE_URL}/river?following=1`)}" class="${opts.following ? 'active' : ''}">Following</a>
      </nav>`
    : ''
  const banner = `<button type="button" id="river-new-posts-banner" class="new-posts-banner" hidden></button>`
  const feedBody = `<div id="river-feed">${cardsHtml}</div><div id="river-load-more-sentinel"></div>${more}`
  const script = feedScript({
    viewerBusinessId: opts.viewerBusinessId ?? null,
    latestPublishedAt: cards[0]?.createdAt.toISOString() ?? null,
    nextCursor,
    following: opts.following,
  })
  const header = renderPublicHeader({ viewerSlug: opts.viewerSlug })
  return page('River', header, `${tabs}${banner}${feedBody}${script}`)
}

export function renderRiverPost(
  card: RiverFeedCard,
  opts: { currentUrl: string; viewerSlug?: string | null },
): string {
  const header = renderPublicHeader({ viewerSlug: opts.viewerSlug })
  return page(`${card.business.name} on River`, header, renderCard(card, opts.currentUrl, 1))
}
