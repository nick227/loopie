import { useState } from 'react'
import { useAssets, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'
import { useFlatPages } from '@/hooks/useFlatPages'

export function MediaSlotField({
  assetId,
  kind,
  fallbackUrl,
  fill,
  onChange,
}: {
  assetId: string | undefined
  kind: 'IMAGE' | 'AUDIO'
  fallbackUrl?: string
  fill?: boolean
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

  function openPicker() {
    setPicked(assetId)
    setOpen(true)
  }

  return (
    <div
      className={
        fill
          ? 'relative min-h-[16rem] bg-[color-mix(in_srgb,var(--lp-ink)_8%,var(--lp-bg))]'
          : 'relative'
      }
    >
      {kind === 'IMAGE' && src ? (
        <img
          src={src}
          alt=""
          className={
            fill ? 'h-full min-h-[16rem] w-full object-cover' : 'aspect-[16/9] w-full object-cover'
          }
        />
      ) : null}
      {kind === 'AUDIO' && src ? <audio controls src={src} className="w-full" /> : null}
      <button
        type="button"
        onClick={openPicker}
        className={
          kind === 'IMAGE'
            ? 'absolute inset-0 flex items-end justify-start p-3 text-xs font-medium'
            : 'mt-2 text-xs underline'
        }
      >
        <span
          className="rounded px-2 py-1"
          style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
        >
          {src
            ? kind === 'IMAGE'
              ? 'Replace image'
              : 'Replace audio'
            : kind === 'IMAGE'
              ? 'Choose image'
              : 'Choose audio'}
        </span>
      </button>
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
