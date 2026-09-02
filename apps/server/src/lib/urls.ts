// This server's own directly-reachable base URL — drives the runtime embed script
// (/loopie.js), uploaded-media URLs embedded in rendered pages, and the one authenticated,
// cookie-scoped link (draft preview) that must stay on the same origin the session cookie
// was issued for. None of these three need to share an origin with the public product domain
// below — a <script>/<img> tag loads fine cross-origin, and the preview link's cookie would
// simply never be sent anywhere else.
export const PUBLIC_SERVER_URL =
  process.env.TRACKING_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

// The single public product domain — every link an anonymous visitor's browser is ever given
// (hosted pages, tracked-click redirects) or a rendered page's own fetch()-driven submit
// action, which DOES need same-origin (otherwise it's a cross-origin fetch this app doesn't
// grant CORS to). In production this is a different literal host than PUBLIC_SERVER_URL above
// — `web` proxies these specific paths down to this process over Railway's private network
// (see apps/web/server/index.js). Falls back to PUBLIC_SERVER_URL when unset (local dev,
// single-process setups).
export const PUBLIC_BASE_URL = process.env.PUBLIC_APP_URL ?? PUBLIC_SERVER_URL

export function trackedDeploymentUrl(deploymentId: string) {
  return `${PUBLIC_BASE_URL}/r/${deploymentId}`
}

export function trackedAdRunUrl(adRunId: string) {
  return `${PUBLIC_BASE_URL}/r/adrun/${adRunId}`
}

export function trackedAffiliateUrl(affiliateId: string) {
  return `${PUBLIC_BASE_URL}/r/affiliate/${affiliateId}`
}

export function hostedPageUrl(slug: string) {
  return `${PUBLIC_BASE_URL}/p/${slug}`
}

export function publicBusinessProfileUrl(slug: string) {
  return `${PUBLIC_BASE_URL}/b/${slug}`
}

export function landingPagePreviewUrl(landingPageId: string) {
  return `${PUBLIC_SERVER_URL}/landing-pages/${landingPageId}/preview`
}

export function landingPageSubmitUrl(landingPageId: string) {
  return `${PUBLIC_BASE_URL}/landing-pages/${landingPageId}/submissions`
}

export function riverPostUrl(riverPostId: string) {
  return `${PUBLIC_BASE_URL}/river/posts/${riverPostId}`
}

export function riverPostClickUrl(riverPostId: string) {
  return `${PUBLIC_BASE_URL}/river/posts/${riverPostId}/click`
}

export function riverPostVisitProfileUrl(riverPostId: string) {
  return `${PUBLIC_BASE_URL}/river/posts/${riverPostId}/visit-profile`
}

// PUBLIC_SERVER_URL, not PUBLIC_BASE_URL — same reasoning as landingPagePreviewUrl above: this is
// the one River link that must stay on the origin the session cookie was issued for, so a logged-in
// business is actually recognized as a viewer (see lib/riverViewer.ts and the slice-2 plan doc).
// RiverPost.permalinkUrl stays on PUBLIC_BASE_URL — that one is for anonymous external sharing.
export function riverViewerUrl(path: string = '/river') {
  return `${PUBLIC_SERVER_URL}${path}`
}
