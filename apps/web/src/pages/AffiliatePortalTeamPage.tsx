import { Users } from 'lucide-react'
import { useAffiliates, useAffiliateDeals, useMyAffiliate, useUpdateAffiliate } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBps } from '@/lib/money'

export function AffiliatePortalTeamPage() {
  const me = useMyAffiliate()
  const list = useAffiliates({ limit: 100 })
  const deals = useAffiliateDeals({ limit: 100 })
  const update = useUpdateAffiliate()
  const mine = me.data?.data
  const downline = (list.data?.pages.flatMap((p) => p.data) ?? []).filter((row) => row.managerId === mine?.id)
  const dealItems = deals.data?.pages.flatMap((p) => p.data) ?? []

  if (me.isLoading || list.isLoading) return <Skeleton className="h-48 w-full" />
  if (!downline.length) {
    return <EmptyState icon={Users} title="No team yet" description="People assigned to you will show up here." />
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Team</h1>
      {downline.map((row) => (
        <Card key={row.id}>
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{formatBps(row.commissionRateBps)}</p>
            <select
              className="h-9 w-full rounded border border-input-border bg-transparent px-3 text-sm"
              value={row.dealId ?? ''}
              onChange={(e) => update.mutate({ affiliateId: row.id, dealId: e.target.value })}
            >
              {dealItems.map((deal) => (
                <option key={deal.id} value={deal.id}>{deal.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
