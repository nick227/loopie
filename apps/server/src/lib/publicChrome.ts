import { escapeHtml } from './riverFeedRender'
import { riverViewerUrl } from './urls'

// Shared header for LOOPIE's two owned public destinations — GET /river and GET /b/{slug}. Scoped
// deliberately to just these two (see the slice-5 plan doc): hosted landing pages (/p/{slug}) are
// a business's own customer-facing, template-styled page, not LOOPIE's — this chrome never wraps
// those. Links always go through riverViewerUrl (PUBLIC_SERVER_URL) so a recognized viewer stays
// recognized when moving between River and a profile — see lib/riverViewer.ts.
export const PUBLIC_CHROME_STYLES = `
  .public-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1080px;
    margin: 0 auto 20px;
    padding: 0 0 16px;
  }
  .public-header a.wordmark { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; color: #1c1c1a; text-decoration: none; }
  .public-header a.my-profile-link { font-size: 13px; font-weight: 600; color: #6b6b64; text-decoration: none; }
  .public-header a.my-profile-link:hover { color: #1c1c1a; }
`

export function renderPublicHeader(opts: { viewerSlug?: string | null }): string {
  const myProfile = opts.viewerSlug
    ? `<a class="my-profile-link" href="${escapeHtml(riverViewerUrl(`/b/${opts.viewerSlug}`))}">My Profile</a>`
    : ''
  return `<header class="public-header">
    <a class="wordmark" href="${escapeHtml(riverViewerUrl('/river'))}">River</a>
    ${myProfile}
  </header>`
}
