// Off-SPA destinations from River content (a tracked post permalink/click redirect) — same
// "pop out, keep the feed in view" convention documented on RiverExternalHref's other callers.
// Business profiles used to live here too (riverBusinessProfileHref) but are now a real in-app
// route — see the "Business profiles: redesign + fold into the app shell" plan doc — so every
// profile link is a plain <Link> now (see trackRiverProfileVisit below for how the one remaining
// server-side effect of the old hop, the PROFILE_VISIT engagement event, survives that switch).
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export function riverExternalHref(path: string) {
  return `${API_BASE}${path}`
}

// GET /river/posts/{id}/visit-profile records a PROFILE_VISIT engagement event, then 302s to
// GET /b/{slug} — fire it in the background alongside the in-app <Link> to the same destination,
// so the one real server-side effect of the old external-redirect convention survives the switch
// to real client-side navigation. `mode: 'no-cors'` since this crosses to the API origin and we
// only care about the side effect, not the (opaque, unreadable) response — the fetch spec requires
// `redirect: 'follow'` for a no-cors request, so this does still walk the redirect and fetch the
// profile HTML a second time, but as a discarded background response, not a page navigation.
// Best-effort — a dropped analytics beacon should never block or fail the navigation it's on.
export function trackRiverProfileVisit(riverPostId: string) {
  fetch(riverExternalHref(`/river/posts/${riverPostId}/visit-profile`), {
    mode: 'no-cors',
  }).catch(() => {})
}
