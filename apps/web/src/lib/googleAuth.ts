const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Full-page redirect into the server's Google OAuth start route (sets the session cookie on callback). */
export function startGoogleAuth(returnTo?: string, referralCode?: string | null) {
  const url = new URL('/auth/google', API_BASE)
  let path = returnTo
  if (referralCode && path?.startsWith('/') && !path.startsWith('//')) {
    path += (path.includes('?') ? '&' : '?') + `ref=${encodeURIComponent(referralCode)}`
  }
  if (path?.startsWith('/') && !path.startsWith('//')) {
    url.searchParams.set('returnTo', path)
  }
  window.location.assign(url.toString())
}
