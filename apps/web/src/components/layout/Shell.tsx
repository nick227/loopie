import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { Inbox as InboxIcon, Mail, LogOut, Handshake, Bell, Waves, Command } from 'lucide-react'
import { useCurrentUser, useInboxThreads, useLogout } from '@project/sdk'
import { AD_CREATIVE_STYLESHEET } from '@project/ad-renderer'
import { cn } from '@/lib/utils'
import { CreateMenu, CreateButtonTrigger } from '@/components/layout/CreateMenu'
import { SetHeaderTitleContext } from '@/lib/headerContext'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Skeleton } from '@/components/ui/Skeleton'
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher'

// Keyed by pathname so a page that crashed mid-render gets a clean slate on the next navigation,
// without forcing Shell itself (header/nav) to remount — scoped to just the routed content, not
// the whole layout. See App.tsx's own top-level boundary for why it no longer does this.
function RouteContent() {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

// Persistent top nav (2026-08-30 revision) — replaces the "Inbox is the root" model
// (docs/strategy/03-product-principles.md's original 2026-08-29 thesis). That thesis didn't hold
// up in practice; reverted to real peer tabs, directly requested and inspired by a reference
// screenshot. Calendar is the default workspace; the former Home overview now lives inside the
// private profile, so it no longer occupies a peer tab.
const NAV_TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/calendar', label: 'Calendar', end: true },
  { to: '/landing-pages', label: 'Pages' },
  { to: '/ads', label: 'Advertising' },
  { to: '/contacts', label: 'CRM' },
]
// River isn't one of the visible text tabs above (it lives in the trailing icon cluster, see
// Header below) but it's a primary destination in its own right now, not a page reached *from*
// one of these — so it gets the same "no back-subheader" treatment as the text tabs do.

const AFFILIATE_NAV = [
  { to: '/portal', label: 'Home', icon: InboxIcon, end: true },
  { to: '/portal/team', label: 'Team', icon: Handshake },
  { to: '/portal/payouts', label: 'Payouts', icon: Mail },
]

function MessagesButton() {
  const inbox = useInboxThreads({ filter: 'unread' })
  const unreadCount = inbox.data?.data?.length ?? 0
  const navigate = useNavigate()

  return (
    <button
      type="button"
      aria-label={unreadCount ? `Messages, ${unreadCount} unread` : 'Messages'}
      onClick={() => navigate('/messages')}
      className="relative hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
    >
      <Bell size={17} />
      {unreadCount ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </button>
  )
}

function Header({
  pageTitle,
  businessName,
  email,
  isLoading,
  isAuthenticated,
}: {
  pageTitle: string | null
  businessName?: string
  email?: string
  // River is the one route Shell renders outside <AuthGuard/> (see App.tsx) — an anonymous
  // visitor can land here directly, so the trailing action cluster (Create/Bell/Profile, all of
  // which need an authenticated account) has to degrade gracefully instead of assuming `me`
  // always resolved successfully before Shell ever mounted, the way every other route could.
  isLoading: boolean
  isAuthenticated: boolean
}) {
  // The browser tab title — the one real consumer of usePageTitle's "report an entity's name
  // upward" contract (see headerContext.tsx); the persistent nav's own header chrome has no
  // separate title slot to render this into.
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Loopie` : 'Loopie'
  }, [pageTitle])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[900px] items-center gap-2">
        <Link to="/calendar" className="flex shrink-0 items-center gap-2 rounded-lg py-1.5 pr-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Command size={16} />
          </span>
        </Link>
        {/* Active company — switch companies from Profile → Your team. */}
        <Link
          to="/profile"
          className="hidden shrink-0 truncate rounded-lg px-1.5 py-1.5 text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-accent sm:inline"
        >
          {businessName ?? 'Loopie'}
        </Link>

        <nav
          aria-label="Primary"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 sm:justify-center"
        >
          {NAV_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 justify-center flex whitespace-nowrap border-b-2 px-auto py-2 text-sm font-medium transition-colors min-w-[90px] align-center',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          {isAuthenticated ? (
            <CreateMenu trigger={({ onClick }) => <CreateButtonTrigger onClick={onClick} />} />
          ) : null}

          {isAuthenticated ? <MessagesButton /> : null}

          {isAuthenticated ? <AssistantLauncher /> : null}

          {/* The one route Shell renders for an anonymous visitor too (River, outside
              <AuthGuard/> — see App.tsx) — always visible, not gated on isAuthenticated. */}
          <NavLink
            to="/river"
            aria-label="River"
            className={({ isActive }) =>
              cn(
                'hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:flex',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Waves size={17} />
          </NavLink>

          {isAuthenticated ? (
            <NavLink
              to="/profile"
              aria-label="Profile"
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border bg-accent transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive ? 'border-foreground/50' : 'border-border',
                )
              }
            >
              <span className="text-xs font-semibold text-foreground">
                {email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </NavLink>
          ) : !isLoading ? (
            <Link
              to="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function Shell() {
  const logout = useLogout()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const role = me.data?.data?.role ?? 'USER'
  const isAffiliate = role === 'AFFILIATE'
  const isAuthenticated = Boolean(me.data?.data)
  const landingPageMatch = useMatch('/landing-pages/:landingPageId')
  const isLandingPageEditor =
    Boolean(landingPageMatch) && landingPageMatch?.params.landingPageId !== 'new'
  // Shell is now a persistent instance across navigation (see App.tsx — the pathname-keyed
  // boundary that used to force a full remount on every route change was removed so the
  // header/nav don't tear down and rebuild on every click). No manual reset-on-navigate needed
  // here regardless: usePageTitle (headerContext.tsx) already calls setTitle(null) on its own
  // cleanup, which fires whenever <Outlet/> swaps to a different page component — a stale entity
  // title from the previous route can't leak in. (This is unrelated to InboxFeed's filter state,
  // which lives in a persisted module store for a different reason: a *page* component's own
  // local state still doesn't survive its own unmount/remount when Outlet swaps routes — only
  // Shell itself no longer does.)
  const [pageTitle, setPageTitle] = useState<string | null>(null)

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  // Affiliates are a separate persona/flow with their own nav shape entirely (Home/Team/Payouts) —
  // out of scope for the persistent-header change, which is about the business-user shell.
  if (isAffiliate) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
        <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r border-border bg-surface/50 backdrop-blur-xl px-4 py-6 gap-6 z-40">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Command size={18} />
            </div>
            <span className="font-semibold tracking-tight text-lg">Loopie</span>
          </div>
          <div className="flex-1 space-y-1.5 mt-4">
            {AFFILIATE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/80',
                  )
                }
              >
                <item.icon
                  size={18}
                  className="opacity-80 group-hover:opacity-100 transition-opacity"
                />
                {item.label}
              </NavLink>
            ))}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors group mt-auto"
          >
            <LogOut size={18} className="opacity-80 group-hover:opacity-100 transition-opacity" />
            Log out
          </button>
        </aside>
        <div className="md:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 pb-20 md:pb-8 pt-8">
            <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 animate-in">
              <RouteContent />
            </div>
          </main>
        </div>
        <nav
          aria-label="Primary navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md flex overflow-x-auto px-2 py-3 z-50 pb-[env(safe-area-inset-bottom)]"
        >
          {AFFILIATE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn(isActive ? 'opacity-100' : 'opacity-70')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className="">
      {/* Mounted once, app-wide — Ad Designer's live preview and River's AD post rendering both
          inject the shared @project/ad-renderer fragment via dangerouslySetInnerHTML and rely on
          this being present exactly once (see CLAUDE.md's Ad Designer "CRITICAL RENDERING
          REQUIREMENT"). The embed/Page-iframe surfaces inline their own copy server-side instead —
          this tag only covers in-SPA rendering. */}
      <style dangerouslySetInnerHTML={{ __html: AD_CREATIVE_STYLESHEET }} />
      <Header
        pageTitle={pageTitle}
        businessName={me.data?.data?.businessName}
        email={me.data?.data?.email}
        isLoading={me.isLoading}
        isAuthenticated={isAuthenticated}
      />
      <main className="flex-1 pb-10 pt-6">
        <div className={cn('mx-auto w-full', isLandingPageEditor ? 'max-w-none' : 'max-w-[900px]')}>
          <SetHeaderTitleContext.Provider value={setPageTitle}>
            <RouteContent />
          </SetHeaderTitleContext.Provider>
        </div>
      </main>
    </div>
  )
}
