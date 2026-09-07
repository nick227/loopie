import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Building2, CreditCard, LogOut, ShieldCheck } from 'lucide-react'
import { useBilling, useCurrentUser, useLogout } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { BusinessHeader } from '@/components/business/BusinessHeader'
import { subscriptionStatusLabel, toBillingSnapshot } from '@/lib/billingCopy'
import { WelcomeSection } from '@/components/welcome/WelcomeSection'
import { useRestoreOverviewScroll } from '@/hooks/useOverviewScroll'

function roleLabel(role: string | undefined, isFounder?: boolean, membershipRole?: string) {
  if (isFounder) return 'Founder'
  if (membershipRole === 'OWNER') return 'Owner'
  if (membershipRole === 'MEMBER') return 'Team member'
  if (role === 'SITE_ADMIN') return 'Site administrator'
  if (role === 'AFFILIATE') return 'Affiliate'
  return 'Team member'
}

function BillingSummary() {
  const billing = useBilling()
  const data = toBillingSnapshot(billing.data?.data)

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <CreditCard size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Billing
          </p>
          {billing.isLoading ? (
            <Skeleton className="mt-3 h-10 w-full" />
          ) : billing.isError ? (
            <p className="mt-2 text-sm text-destructive">Billing status could not be loaded.</p>
          ) : (
            <>
              <p className="mt-2 font-medium text-foreground">
                {data?.planName ?? 'LOOPIE'}
                {data?.planPriceLabel ? ` · ${data.planPriceLabel}` : ''}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {subscriptionStatusLabel(data?.subscriptionStatus)}
              </p>
            </>
          )}
        </div>
      </div>
      <Link
        to="/billing"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Manage billing <ArrowUpRight size={14} />
      </Link>
    </section>
  )
}

export function ProfilePage() {
  useRestoreOverviewScroll()
  const me = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me.data?.data
  const isAffiliate = user?.platformRole === 'AFFILIATE'

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  if (!user) return <Skeleton className="h-72 w-full" />

  return (
    <div className="space-y-6">
      <BusinessHeader />

      <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <Building2 size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Account
            </p>
            <p className="mt-2 truncate font-medium text-foreground">
              {user.businessName || 'Loopie account'}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-5 w-full"
          loading={logout.isPending}
          onClick={handleLogout}
        >
          <LogOut size={15} />
          Sign out
        </Button>
      </section>

      {!isAffiliate ? (
        <section aria-labelledby="business-overview-heading" className="space-y-4">
          <WelcomeSection />
        </section>
      ) : null}
    </div>
  )
}
