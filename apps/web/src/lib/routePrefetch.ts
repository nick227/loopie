// Primary nav destinations — same chunks App.tsx lazy()-loads. Warming them on idle / hover
// means the first tab click rarely suspends, so Suspense never swaps to a blank skeleton.

const PREFETCHERS: Record<string, () => Promise<unknown>> = {
  '/calendar': () => import('@/pages/calendar/CalendarPage'),
  '/landing-pages': () => import('@/pages/landing-pages/LandingPagesPage'),
  '/ads': () => import('@/pages/ads/AdsPage'),
  '/contacts': () => import('@/pages/contacts/ContactsPage'),
  '/messages': () => import('@/pages/messages/MessagesPage'),
  '/river': () => import('@/pages/river/RiverPage'),
  '/profile': () => import('@/pages/core/ProfilePage'),
  '/media': () => import('@/pages/media/MediaPage'),
}

const warmed = new Set<string>()

export function prefetchRoute(path: string) {
  const base = path.split('?')[0]?.replace(/\/$/, '') || path
  if (warmed.has(base)) return
  const loader = PREFETCHERS[base]
  if (!loader) return
  warmed.add(base)
  void loader()
}

export function prefetchPrimaryRoutes() {
  const run = () => {
    for (const path of Object.keys(PREFETCHERS)) prefetchRoute(path)
  }
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 })
  } else {
    setTimeout(run, 400)
  }
}
