import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { PageSpinner } from '@/components/ui/Spinner'

export function AuthGuard() {
  const query = useCurrentUser()
  if (query.isLoading) return <PageSpinner />
  if (query.isError || !query.data?.data) return <Navigate to="/login" replace />
  return <Outlet />
}
