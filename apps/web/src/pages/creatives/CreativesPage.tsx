import { Link } from 'react-router-dom'
import { useCreatives } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreativeRow } from '@/components/campaigns/CreativeRow'
import { Image, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CreativesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCreatives()
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Creatives</h1>
          <p className="text-xs text-muted-foreground">
            Reusable library. Attach a creative from a campaign.
          </p>
        </div>
        <Link to="/creatives/new">
          <Button size="sm">
            <Plus size={14} /> New
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No creatives yet"
          description="Create a creative, then attach it to a campaign."
        />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/creatives/${item.id}`}>
            <CreativeRow creative={item} />
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
