import { Navigate, Outlet } from 'react-router-dom'
import { ApiError, useCurrentUser } from '@project/sdk'
import { PageSpinner } from '@/components/ui/Spinner'

export function AuthGuard() {
  const query = useCurrentUser()
  if (query.isLoading) return <PageSpinner />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 401) {
      return <Navigate to="/login" replace />
    }
    return (
      <div
        role="alert"
        className="mx-auto mt-16 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-center"
      >
        <h1 className="font-semibold">Account status unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your session could not be checked. This may be temporary.
        </p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-3 text-sm underline underline-offset-4"
        >
          Retry
        </button>
      </div>
    )
  }
  if (!query.data?.data) return <Navigate to="/login" replace />
  return <Outlet />
}
