import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { useAffiliates, useAffiliateDeals, useMyAffiliate, useUpdateAffiliate } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SELECT_CLASS } from '@/components/affiliates/DestinationPicker'
import { formatBps } from '@/lib/money'
import { useFlatPages } from '@/hooks/useFlatPages'

export function AffiliatePortalTeamPage() {
  const me = useMyAffiliate()
  const list = useAffiliates({ limit: 100 })
  const deals = useAffiliateDeals({ limit: 100 })
  const update = useUpdateAffiliate()
  const mine = me.data?.data
  const allPeople = useFlatPages(list)
  const dealItems = useFlatPages(deals)

  const downline = useMemo(
    () => allPeople.filter((row) => row.managerId === mine?.id),
    [allPeople, mine?.id],
  )

  const { dealsByClass, unscopedDeals } = useMemo(() => {
    const map = new Map<string, typeof dealItems>()
    const unscoped: typeof dealItems = []
    for (const deal of dealItems) {
      if (!deal.classId) unscoped.push(deal)
      else {
        let list = map.get(deal.classId)
        if (!list) {
          list = []
          map.set(deal.classId, list)
        }
        list.push(deal)
      }
    }
    return { dealsByClass: map, unscopedDeals: unscoped }
  }, [dealItems])

  if (me.isLoading || list.isLoading) return <Skeleton className="h-48 w-full" />
  if (!downline.length) {
    return (
      <EmptyState
        icon={Users}
        title="No team yet"
        description="People assigned to you will show up here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Team</h1>
      <p className="text-xs text-muted-foreground">
        Assigning a deal applies to the next sale. Past commissions stay frozen.
      </p>
      {downline.map((row) => {
        const allowed = [
          ...unscopedDeals,
          ...(row.classId ? dealsByClass.get(row.classId) || [] : []),
        ]
        return (
          <Card key={row.id}>
            <CardContent className="py-4 space-y-2">
              <p className="text-sm font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">{formatBps(row.commissionRateBps)}</p>
              <select
                className={SELECT_CLASS}
                value={row.dealId ?? ''}
                onChange={(e) => {
                  if (
                    !window.confirm(
                      'This deal applies to the next sale. Past commissions stay as they are.',
                    )
                  )
                    return
                  update.mutate({ affiliateId: row.id, dealId: e.target.value })
                }}
              >
                {allowed.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
