import { useState } from 'react'
import { Image } from 'lucide-react'
import { useAssets } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { MediaGrid } from '@/components/media/MediaGrid'
import { MediaUploadBar } from '@/components/media/MediaUploadBar'
import { MEDIA_TYPES, type MediaTypeFilter } from '@/components/media/MediaToolbar'
import { useFlatPages } from '@/hooks/useFlatPages'

type AssetType = (typeof MEDIA_TYPES)[number]

function GridSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  )
}

export function MediaPicker({
  selectedIds,
  adding,
  onToggle,
  onAdd,
  onConfirm,
  onClose,
  single,
  type: lockedType,
}: {
  selectedIds: string[]
  adding: boolean
  onToggle: (assetId: string) => void
  onAdd: (input: AddMediaInput) => Promise<void>
  onConfirm: () => void
  onClose: () => void
  single?: boolean
  type?: AssetType
}) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<MediaTypeFilter>(lockedType ?? '')
  const query = useAssets({
    q: q || undefined,
    type: (lockedType ?? type) || undefined,
  })
  const assets = useFlatPages(query)
  const count = selectedIds.length
  const canUse = single ? count === 1 : count > 0
  const showSkeletons = query.isPending || (query.isFetching && assets.length === 0)

  return (
    <Modal
      title="Insert media"
      size="full"
      onClose={onClose}
      toolbar={
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search media"
              className="h-11 text-base sm:h-10 sm:text-sm"
            />
          </div>
          {lockedType ? null : (
            <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { value: '' as const, label: 'All' },
                ...MEDIA_TYPES.map((value) => ({
                  value,
                  label: value.slice(0, 1) + value.slice(1).toLowerCase(),
                })),
              ].map((row) => (
                <button
                  key={row.value || 'all'}
                  type="button"
                  onClick={() => setType(row.value)}
                  className={`shrink-0 rounded-md px-3 min-h-11 text-sm sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                    type === row.value
                      ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {row.label}
                </button>
              ))}
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm tabular-nums text-muted-foreground">
            {count === 0 ? 'None selected' : `${count} selected`}
          </p>
          <Button
            type="button"
            className="min-h-11 w-full sm:min-h-0 sm:w-auto"
            onClick={onConfirm}
            disabled={!canUse}
          >
            Use selected
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MediaUploadBar adding={adding} lockedType={lockedType} onAdd={onAdd} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-5">
          {showSkeletons ? (
            <GridSkeletons />
          ) : assets.length === 0 ? (
            <EmptyState
              icon={Image}
              title={q || type ? 'No matching media' : 'No media yet'}
              description={q || type ? 'Try a different search.' : 'Upload a file to add media.'}
            />
          ) : (
            <MediaGrid
              compact
              assets={assets}
              selectedIds={selectedIds}
              onToggle={onToggle}
              hasNextPage={!!query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              fetchNextPage={query.fetchNextPage}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
