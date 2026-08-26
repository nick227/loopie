import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { PageSpinner } from '@/components/ui/Spinner'
import { HomeSummaryPage } from '@/pages/core/HomeSummaryPage'

export function RequireRole({ role, children }: { role: string | string[]; children: ReactNode }) {
  const me = useCurrentUser()
  if (me.isLoading) return <PageSpinner />
  const current = me.data?.data?.role
  if (!current) return <Navigate to="/login" replace />
  const allowed = Array.isArray(role) ? role.includes(current) : current === role
  if (!allowed) return <Navigate to={current === 'AFFILIATE' ? '/portal' : '/home'} replace />
  return children
}

export function HomeRoute() {
  const me = useCurrentUser()
  if (me.isLoading) return <PageSpinner />
  if (me.data?.data?.role === 'AFFILIATE') return <Navigate to="/portal" replace />
  return <HomeSummaryPage />
}
