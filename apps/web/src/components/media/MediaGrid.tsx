import type { components } from '@project/sdk'
import { MediaCard } from '@/components/media/MediaCard'

type Asset = components['schemas']['Asset']

export function MediaGrid({
  assets,
  selectedIds,
  onToggle,
  linkTo,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  assets: Asset[]
  selectedIds?: string[]
  onToggle?: (assetId: string) => void
  linkTo?: (asset: Asset) => string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {assets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            selected={selectedIds?.includes(asset.id)}
            onSelect={onToggle ? () => onToggle(asset.id) : undefined}
            to={linkTo ? linkTo(asset) : undefined}
          />
        ))}
      </div>
      {hasNextPage && fetchNextPage ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
