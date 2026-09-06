import { useCurrentUser, useAdminEndSupportSession } from '@project/sdk'
import { useQueryClient } from '@tanstack/react-query'

export function SupportModeBanner() {
  const { data } = useCurrentUser()
  const user = data?.data
  const queryClient = useQueryClient()
  const endSession = useAdminEndSupportSession({
    onSuccess: () => {
      // Refresh user context
      queryClient.invalidateQueries({ queryKey: ['auth', 'current-user'] })
      // Navigate to /admin (optional, but good UX)
      window.location.href = '/admin'
    },
  })

  if (!user || !user.isSupportMode) return null

  return (
    <div className="flex h-10 w-full items-center justify-center space-x-4 bg-orange-500 px-4 text-sm font-medium text-white shadow-md">
      <span>Support Mode &middot; {user.businessName}</span>
      <button
        onClick={() => endSession.mutate()}
        disabled={endSession.isPending}
        className="rounded bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-white/30 disabled:opacity-50"
      >
        {endSession.isPending ? 'Exiting...' : 'Exit'}
      </button>
    </div>
  )
}
