import { useState, type FormEvent } from 'react'
import { useAsset } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { AdMediaEmpty, AdMediaStage } from '@/components/ads/AdMediaStage'
import { AdPostNow } from '@/components/ads/AdPostNow'
import { POST_TARGETS, type PreviewFrameId } from '@/lib/adPreview'

export function AdForm({
  name,
  assetIds,
  pending,
  error,
  submitLabel,
  onName,
  onAssetIds,
  onAddAsset,
  onSubmit,
  onPostNow,
}: {
  name: string
  assetIds: string[]
  pending: boolean
  error: string | null
  submitLabel: string
  onName: (value: string) => void
  onAssetIds: (ids: string[]) => void
  onAddAsset: (input: AddMediaInput) => Promise<void>
  onSubmit: () => Promise<void>
  onPostNow?: (input: {
    targets: Array<{ platform: 'META' | 'TIKTOK'; placement: string }>
    budget: number
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [frameId, setFrameId] = useState<PreviewFrameId>('native')
  const [scale, setScale] = useState(1)
  const [postKeys, setPostKeys] = useState<string[]>([])
  const [budget, setBudget] = useState(10)
  const onDeckId = assetIds[0]
  const assetQuery = useAsset(onDeckId ?? '')
  const onDeck = assetQuery.data?.data

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Ad name" required />

      <div className="space-y-2">
        <p className="text-sm font-medium">Media</p>
        {onDeck ? (
          <AdMediaStage
            asset={onDeck}
            frameId={frameId}
            scale={scale}
            onFrame={setFrameId}
            onScale={setScale}
            onRemove={() => onAssetIds([])}
          />
        ) : onDeckId ? (
          <Skeleton className="min-h-56 w-full rounded-xl" />
        ) : (
          <AdMediaEmpty onChoose={() => setOpen(true)} />
        )}
      </div>

      {onPostNow && onDeck ? (
        <AdPostNow
          mediaType={onDeck.type === 'AUDIO' ? undefined : onDeck.type}
          selected={postKeys}
          budget={budget}
          onToggle={(key) =>
            setPostKeys((current) =>
              current.includes(key) ? current.filter((row) => row !== key) : [...current, key],
            )
          }
          onBudget={setBudget}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending || !name || assetIds.length === 0}>
          {submitLabel}
        </Button>
        {onPostNow ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending || !name || assetIds.length === 0 || postKeys.length === 0}
            onClick={() =>
              onPostNow({
                targets: POST_TARGETS.filter((row) => postKeys.includes(row.key)).map((row) => ({
                  platform: row.platform,
                  placement: row.placement,
                })),
                budget,
              })
            }
          >
            Post now
          </Button>
        ) : null}
      </div>

      {open ? (
        <MediaPicker
          selectedIds={assetIds}
          adding={pending}
          single
          onToggle={(id) => onAssetIds(assetIds[0] === id ? [] : [id])}
          onAdd={onAddAsset}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </form>
  )
}
