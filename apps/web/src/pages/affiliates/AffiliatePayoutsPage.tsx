import { useAffiliates } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { OwedRow } from './components/OwedRow'

export function AffiliatePayoutsPage() {
  const list = useAffiliates({ limit: 100 })
  const items = list.data?.pages.flatMap((p) => p.data) ?? []
  const owed = [...items]
    .filter((row) => row.pendingMinor > 0 || row.payableMinor > 0 || row.openPayoutStatus)
    .sort((a, b) => b.payableMinor + b.pendingMinor - (a.payableMinor + a.pendingMinor))

  if (list.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payouts</h1>
      <AffiliateNav />
      <p className="text-sm text-muted-foreground">
        Frozen commissions only — there is no separate affiliate balance.
      </p>
      {owed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody is owed right now.</p>
      ) : (
        owed.map((row) => (
          <OwedRow
            key={row.id}
            affiliateId={row.id}
            name={row.name}
            pendingMinor={row.pendingMinor}
            payableMinor={row.payableMinor}
            openPayoutStatus={row.openPayoutStatus ?? null}
            payoutsEnabled={row.payoutsEnabled}
            connectStatus={row.connectStatus}
          />
        ))
      )}
    </div>
  )
}
