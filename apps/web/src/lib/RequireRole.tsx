import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ApiError, useCurrentUser } from '@project/sdk'
import { PageSpinner } from '@/components/ui/Spinner'
import { InboxSummaryPage } from '@/pages/core/InboxSummaryPage'

export function RequireRole({ role, children }: { role: string | string[]; children: ReactNode }) {
  const me = useCurrentUser()
  if (me.isLoading) return <PageSpinner />
  const current = me.data?.data?.role
  if (!current) return <Navigate to="/login" replace />
  const allowed = Array.isArray(role) ? role.includes(current) : current === role
  if (!allowed) return <Navigate to={current === 'AFFILIATE' ? '/portal' : '/home'} replace />
  return children
}

export function RequireNonAffiliate() {
  const me = useCurrentUser()
  if (me.isLoading) return <PageSpinner />
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401)
      return <Navigate to="/login" replace />
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        Your account permissions could not be loaded.
      </p>
    )
  }
  if (me.data?.data?.role === 'AFFILIATE') return <Navigate to="/portal" replace />
  return <Outlet />
}

export function InboxRoute() {
  const me = useCurrentUser()
  if (me.isLoading) return <PageSpinner />
  if (me.data?.data?.role === 'AFFILIATE') return <Navigate to="/portal" replace />
  // First-login step 0 (docs/strategy/03-product-principles.md) — a business that has never
  // saved its identity lands on setup instead of Inbox. A one-time nudge, not a hard gate: once
  // saved, businessIdentityCompletedAt never goes back to null, and nothing else in the app
  // re-checks this — a user who navigates elsewhere mid-setup isn't chased back here.
  if (!me.data?.data?.businessIdentityCompletedAt) return <Navigate to="/business/setup" replace />
  return <InboxSummaryPage />
}
