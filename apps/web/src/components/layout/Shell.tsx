import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Inbox as InboxIcon,
  Mail,
  LogOut,
  Handshake,
  CreditCard,
  Bell,
  Command,
  ArrowLeft,
  User as UserIcon,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@project/sdk'
import { cn } from '@/lib/utils'
import { CreateMenu, CreateButtonTrigger } from '@/components/layout/CreateMenu'
import { MoreMenu, type MoreMenuItem } from '@/components/layout/MoreMenu'
import { SetHeaderTitleContext } from '@/lib/headerContext'

// Persistent top nav (2026-08-30 revision) — replaces the "Inbox is the root" model
// (docs/strategy/03-product-principles.md's original 2026-08-29 thesis). That thesis didn't hold
// up in practice; reverted to real peer tabs, directly requested and inspired by a reference
// screenshot. See the dated revision note at the top of that doc. Home, Pages, Advertising,
// Contacts, and Messages are all real, equally-weighted root destinations now — no more "root +
// compact launcher for everything else."
const NAV_TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/home', label: 'Home', end: true },
  { to: '/landing-pages', label: 'Pages' },
  { to: '/ads', label: 'Advertising' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/messages', label: 'Messages' },
]
const TAB_ROOT_PATHS = new Set(NAV_TABS.map((tab) => tab.to))

// Business-administration concerns — grouped separately inside the launcher, never their own
// nav presence. Affiliates/Billing are ADMIN-only.
const ADMIN_UTILITY_NAV: MoreMenuItem[] = [
  { to: '/affiliates', label: 'Affiliates', icon: Handshake },
  { to: '/billing', label: 'Billing', icon: CreditCard },
]

const AFFILIATE_NAV = [
  { to: '/portal', label: 'Home', icon: InboxIcon, end: true },
  { to: '/portal/team', label: 'Team', icon: Handshake },
  { to: '/portal/payouts', label: 'Payouts', icon: Mail },
]

// Back-button grammar for everything that ISN'T one of the five tab roots (which show no back
// button at all — the highlighted tab already communicates location, see Header below).
//
// - SINGLETON_ROUTES / ENTITY_ROUTES: unchanged in shape from before this revision, just
//   retargeted — the universal fallback used to be "‹ Inbox" (when Inbox was the app's only root);
//   now it's "‹ Home". An entity's *real* back label/destination still comes from `location.state`
//   — set at the exact link that navigated here (a collection row, or an Inbox thread's "Open
//   contact"/"Open ad"/"Open page" link) — via `{ from, fromTo }`. That's what lets the same
//   Contact page correctly read "‹ Contacts" when browsed from the collection and "‹ Home" when
//   opened directly from an Inbox thread, without lying about which one actually happened. `state`
//   is lost on a direct load/refresh, which is exactly when the fallback (the entity's own
//   collection) is correct anyway. Deliberately *not* navigate(-1): the label must always match
//   where clicking it actually goes, and a raw history pop can't guarantee that once a route (like
//   an Inbox thread) sits in between.
// - Every other authenticated route (create/edit forms, /profile, /activity, legacy Campaign
//   pages, the ~70 still-generic generated pages) falls back to a plain "‹ Home" — always correct,
//   just not a bespoke label. Regexes (not react-router's matchPath) since matchPath would happily
//   bind :contactId to the literal string "new".
//
// No more Business Profile singleton route — its editable fields now live inline on Home
// (WelcomeSection → BusinessIdentityHeader), so there's no longer a standalone page to name here.
// SINGLETON_ROUTES stays as an extension point for a future singleton, not deleted outright.
const SINGLETON_ROUTES: { test: RegExp; fallbackTitle: string }[] = []

const ENTITY_ROUTES: { test: RegExp; fallbackLabel: string; fallbackTo: string }[] = [
  { test: /^\/contacts\/(?!new$)[^/]+$/, fallbackLabel: 'Contacts', fallbackTo: '/contacts' },
  { test: /^\/ads\/(?!new$)[^/]+$/, fallbackLabel: 'Advertising', fallbackTo: '/ads' },
  {
    test: /^\/landing-pages\/(?!new$)[^/]+$/,
    fallbackLabel: 'Pages',
    fallbackTo: '/landing-pages',
  },
  { test: /^\/messages\/(?!new$)[^/]+$/, fallbackLabel: 'Messages', fallbackTo: '/messages' },
]

function Header({
  pageTitle,
  role,
  businessName,
  email,
  onLogout,
}: {
  pageTitle: string | null
  role: string
  businessName?: string
  email?: string
  onLogout: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const utilityNav = role === 'ADMIN' ? ADMIN_UTILITY_NAV : []
  const pathname = location.pathname
  const isTabRoot = TAB_ROOT_PATHS.has(pathname)
  const singletonMatch = SINGLETON_ROUTES.find((route) => route.test.test(pathname))
  const entityMatch = ENTITY_ROUTES.find((route) => route.test.test(pathname))
  const navState = location.state as { from?: string; fromTo?: string } | null | undefined

  // Row 2 (the "‹ Back  Title" strip) only ever renders for non-tab-root pages — a selected tab
  // above already says where you are, so it needs no back affordance of its own.
  let subheader: { title: string; back: { label: string; onClick: () => void } } | null = null
  if (!isTabRoot) {
    if (singletonMatch) {
      subheader = {
        title: pageTitle ?? singletonMatch.fallbackTitle,
        back: { label: 'Home', onClick: () => navigate('/home') },
      }
    } else if (entityMatch) {
      subheader = {
        title: pageTitle ?? '…',
        back: {
          label: navState?.from ?? entityMatch.fallbackLabel,
          onClick: () => navigate(navState?.fromTo ?? entityMatch.fallbackTo),
        },
      }
    } else {
      subheader = {
        title: pageTitle ?? '',
        back: { label: 'Home', onClick: () => navigate('/home') },
      }
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-3 sm:px-6">
        <Link to="/home" className="flex shrink-0 items-center gap-2 rounded-lg py-1.5 pr-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Command size={16} />
          </span>
        </Link>
        {/* No fake business switcher — there's no multi-business membership model in this app
            (User.businessId is a required scalar, one business per account). The business's own
            editable identity now lives inline on Home (WelcomeSection → BusinessIdentityHeader),
            not a separate page, so this just goes there. */}
        <Link
          to="/home"
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
                  'shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
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
          <CreateMenu trigger={({ onClick }) => <CreateButtonTrigger onClick={onClick} />} />

          <button
            type="button"
            aria-label="Notifications"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <Bell size={17} />
          </button>

          {/* The header's one quiet global escape hatch — Business admin utilities plus account
              actions. Navigation of last resort, not the product's primary map. */}
          <MoreMenu
            items={[]}
            utilityItems={utilityNav}
            accountActions={(close) => (
              <>
                <NavLink
                  to="/profile"
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent',
                    )
                  }
                >
                  <UserIcon size={16} className="shrink-0 opacity-70" />
                  Profile
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onLogout()
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut size={16} className="shrink-0 opacity-70" />
                  Log out
                </button>
              </>
            )}
            trigger={({ onClick }) => (
              <button
                type="button"
                onClick={onClick}
                aria-label="Menu"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-accent transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="text-xs font-semibold text-foreground">
                  {email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </button>
            )}
          />
        </div>
      </div>

      {subheader ? (
        <div className="mx-auto flex h-11 w-full max-w-[1200px] items-center gap-1 border-t border-border/60 px-3 sm:px-6">
          <button
            type="button"
            onClick={subheader.back.onClick}
            className="flex shrink-0 items-center gap-1 rounded-lg py-1.5 pl-1.5 pr-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={15} />
            <span className="max-w-[6rem] truncate sm:max-w-[10rem]">{subheader.back.label}</span>
          </button>
          <span className="min-w-0 truncate pl-0.5 text-sm font-semibold text-foreground">
            {subheader.title}
          </span>
        </div>
      ) : null}
    </header>
  )
}

export function Shell() {
  const logout = useLogout()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const role = me.data?.data?.role ?? 'USER'
  const isAffiliate = role === 'AFFILIATE'
  // No manual reset-on-navigate needed: App.tsx's ResettableErrorBoundary already keys the whole
  // Suspense/Routes tree by location.pathname, so Shell itself is a brand-new instance on every
  // pathname change (same mechanism the earlier state-continuity pass relies on — InboxFeed's
  // filter had to move to a persisted module store precisely because local state doesn't survive
  // it). A stale entity title from the previous route can't leak in as a result.
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
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 animate-in">
              <Outlet />
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
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      <Header
        pageTitle={pageTitle}
        role={role}
        businessName={me.data?.data?.businessName}
        email={me.data?.data?.email}
        onLogout={handleLogout}
      />
      <main className="flex-1 pb-10 pt-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 animate-in">
          <SetHeaderTitleContext.Provider value={setPageTitle}>
            <Outlet />
          </SetHeaderTitleContext.Provider>
        </div>
      </main>
    </div>
  )
}
