import { Link } from 'react-router-dom'
import { useAffiliates } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AffiliateNav } from '@/components/affiliates/AffiliateNav'
import { rateLabel } from '@/components/affiliates/AffiliateRow'
import { connectStatusLabel } from '@/components/affiliates/ConnectStatusBadge'
import { formatUsd } from '@/lib/money'
import { Handshake, Plus } from 'lucide-react'

export function AffiliatesPage() {
  const query = useAffiliates()
  const items = query.data?.pages.flatMap((page) => page.data) ?? []

  if (query.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Affiliates</h1>
        <Link to="/affiliates/new">
          <Button size="sm">
            <Plus size={14} /> New
          </Button>
        </Link>
      </div>
      <AffiliateNav />
      {items.length === 0 ? (
        <EmptyState icon={Handshake} title="No affiliates yet" description="Create a class and deal first, then add affiliates." />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/affiliates/${item.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.className ?? 'No class'}
                    {item.managerName ? ` · ${item.managerName}` : ''}
                    {item.isActive ? '' : ' · Paused'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs">{rateLabel(item.commissionRateBps, item.commissionRuleType)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.payableMinor > 0 ? `${formatUsd(item.payableMinor)} payable` : formatUsd(item.pendingMinor) + ' pending'}
                    {` · ${connectStatusLabel(item.connectStatus)}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}
