import { resolveSessionUser } from '../plugins/security'

// The one and only place in this app that does optional-auth detection — every other route
// keeps hard-requiring bearerAuth. Cookie only, no Authorization header fallback: this exists
// for River's server-rendered public pages (a browser, not an API client) — see the River
// slice-2 plan doc for why the cookie is present at all on a `security: []` route (same origin
// as apps/server, reached via PUBLIC_SERVER_URL, not the proxied PUBLIC_BASE_URL).
export async function resolveOptionalViewer(
  request: any,
): Promise<{ businessId: string; businessSlug: string | null } | null> {
  const user = await resolveSessionUser(request.cookies?.token)
  return user ? { businessId: user.businessId, businessSlug: user.business.slug } : null
}
