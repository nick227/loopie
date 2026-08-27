import { useState } from 'react'
import { useAssets, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'
import { useFlatPages } from '@/hooks/useFlatPages'
import { Button } from '@/components/ui/Button'

export function MediaSlotField({
  assetId,
  kind,
  fallbackUrl,
  onChange,
  onClearFallback,
}: {
  assetId: string | undefined
  kind: 'IMAGE' | 'AUDIO'
  fallbackUrl?: string
  onChange: (assetId: string | undefined) => void
  onClearFallback?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | undefined>(assetId)
  const assetsQuery = useAssets({ type: kind, limit: 100 })
  const assets = useFlatPages(assetsQuery)
  const createAsset = useCreateAsset()
  const selected = assets.find((asset) => asset.id === assetId)
  const src = (selected ? mediaSrc(selected.url) : null) ?? fallbackUrl ?? null

  return (
    <div className="space-y-3">
      {kind === 'IMAGE' && src ? (
        <img src={src} alt="" className="aspect-[16/9] w-full rounded-sm object-cover" />
      ) : null}
      {kind === 'AUDIO' && src ? <audio controls src={src} className="w-full" /> : null}
      {!src ? (
        <p className="text-sm text-muted-foreground">
          {kind === 'IMAGE' ? 'Add an image' : 'Add audio'}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPicked(assetId)
            setOpen(true)
          }}
        >
          {src ? 'Replace' : kind === 'IMAGE' ? 'Choose image' : 'Choose audio'}
        </Button>
        {assetId || fallbackUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(undefined)
              onClearFallback?.()
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {open ? (
        <MediaPicker
          assets={assets}
          selectedIds={picked ? [picked] : []}
          adding={createAsset.isPending}
          single
          onToggle={(id) => setPicked(id)}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPicked(id)
          }}
          onConfirm={() => {
            if (picked) onChange(picked)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
