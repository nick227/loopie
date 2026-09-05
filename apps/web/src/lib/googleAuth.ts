const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Full-page redirect into the server's Google OAuth start route (sets the session cookie on callback). */
export function startGoogleAuth(returnTo?: string) {
  const url = new URL('/auth/google', API_BASE)
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
    url.searchParams.set('returnTo', returnTo)
  }
  window.location.assign(url.toString())
}
