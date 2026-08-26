import { Link } from 'react-router-dom'
import { useCreatives } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdRow } from '@/components/ads/AdRow'
import { Image, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function AdsPage() {
  const query = useCreatives()
  const items = useFlatPages(query)

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ads</h1>
          <p className="text-sm text-muted-foreground">
            Reusable library. Attach an ad to a campaign.
          </p>
        </div>
        <Link to="/ads/new">
          <Button size="sm">
            <Plus size={14} /> New ad
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No ads yet"
          description="Create an ad, then attach it to a campaign."
          action={{ label: 'New ad', onClick: () => (window.location.href = '/ads/new') }}
        />
      ) : (
        <div>
          {items.map((item) => (
            <AdRow key={item.id} ad={item} />
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
