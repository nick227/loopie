import { Link } from 'react-router-dom'
import { useAdUnits } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PanelsTopLeft } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const FORMAT_LABEL: Record<string, string> = {
  DISPLAY_BANNER: 'Display banner',
  NATIVE: 'Native',
  EMBED: 'Embed',
}

export function AdUnitsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdUnits()
  const items = useFlatPages({ data: data })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader
        variant="list"
        title="Ad Units"
        description="Ad units belong to a campaign. Open the campaign to create or activate one."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={PanelsTopLeft}
          title="No ad units yet"
          description="Create an ad unit from campaign detail."
        />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/campaigns/${item.campaignId}/ad-units`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{FORMAT_LABEL[item.format] ?? item.format}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.status} · {item.impressions.toLocaleString()} imps
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
