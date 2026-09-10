import { useCurrentUser } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { WelcomeSection } from '@/components/welcome/WelcomeSection'
import { useRestoreOverviewScroll } from '@/hooks/useOverviewScroll'

export function ProfilePage() {
  useRestoreOverviewScroll()
  const me = useCurrentUser()
  const user = me.data?.data
  const isAffiliate = user?.platformRole === 'AFFILIATE'

  if (!user) return <Skeleton className="h-72 w-full" />

  return (
    <div className="space-y-6">
      {!isAffiliate ? (
        <section aria-labelledby="business-overview-heading" className="space-y-4">
          <WelcomeSection />
        </section>
      ) : null}
    </div>
  )
}
