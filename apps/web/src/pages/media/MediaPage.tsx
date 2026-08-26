import { useState } from 'react'
import { useAssets, useCreateAsset } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddMediaForm } from '@/components/media/AddMediaForm'
import { MediaGrid } from '@/components/media/MediaGrid'
import { MediaToolbar, type MediaTypeFilter } from '@/components/media/MediaToolbar'
import { Image, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function MediaPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<MediaTypeFilter>('')
  const [addingOpen, setAddingOpen] = useState(false)
  const query = useAssets({ q: q || undefined, type: type || undefined })
  const createAsset = useCreateAsset()
  const items = useFlatPages(query)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Media</h1>
          <p className="text-sm text-zinc-500 mt-1">Shared library. Use it in ads and messages.</p>
        </div>
        <Button onClick={() => setAddingOpen((open) => !open)}>
          <Plus size={16} className="mr-2" /> Upload
        </Button>
      </div>

      {addingOpen ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
          <AddMediaForm
            adding={createAsset.isPending}
            onAdd={async (input) => {
              await createAsset.mutateAsync(input)
              setAddingOpen(false)
            }}
          />
        </div>
      ) : null}

      <MediaToolbar q={q} type={type} onQ={setQ} onType={setType} />

      {query.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Image}
          title={q || type ? 'No matching media' : 'No media yet'}
          description={q || type ? 'Try adjusting search or type.' : 'Upload a file or add a URL.'}
          action={q || type ? undefined : { label: 'Upload', onClick: () => setAddingOpen(true) }}
        />
      ) : (
        <MediaGrid
          assets={items}
          linkTo={(asset) => `/media/${asset.id}`}
          hasNextPage={!!query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      )}
    </div>
  )
}
