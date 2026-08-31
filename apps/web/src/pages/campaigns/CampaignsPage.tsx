import { Link } from 'react-router-dom'
import { useCampaigns } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Megaphone, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
}

export function CampaignsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCampaigns()
  const items = useFlatPages({ data: data })

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <Link to="/campaigns/new">
          <Button size="sm">
            <Plus size={14} /> New
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign to start running paid advertising."
          action={{
            label: 'New Campaign',
            onClick: () => (window.location.href = '/campaigns/new'),
          }}
        />
      ) : (
        <VirtualInfiniteList
          items={items}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          renderItem={(item) => (
            <Link key={item.id} to={`/campaigns/${item.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.budget.toLocaleString()} budget
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-1 bg-accent text-accent-foreground shrink-0">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
        />
      )}
    </div>
  )
}
