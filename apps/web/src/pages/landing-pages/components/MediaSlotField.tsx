import { useState } from 'react'
import { useAsset, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'

// Two modes: the default (assetId-backed, uploaded asset library) and urlMode (a template stores a
// plain URL string on its own content rather than an assetId — e.g. Corporate Professional). Both
// modes open the same site-wide media library modal (upload or pick an existing asset); urlMode just
// writes the resolved asset URL back into the template's field instead of storing an assetId.
export function MediaSlotField({
  assetId,
  kind,
  fallbackUrl,
  fill,
  urlMode,
  onChange,
  onUrlChange,
}: {
  assetId?: string | undefined
  kind: 'IMAGE' | 'AUDIO'
  fallbackUrl?: string
  fill?: boolean
  urlMode?: boolean
  onChange?: (assetId: string | undefined) => void
  onClearFallback?: () => void
  onUrlChange?: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | undefined>(assetId)
  const [resolvingUrlPick, setResolvingUrlPick] = useState(false)
  const assetQuery = useAsset(urlMode ? '' : (assetId ?? ''))
  const pickedAssetQuery = useAsset(urlMode ? (picked ?? '') : '')
  const createAsset = useCreateAsset()
  const selected = assetQuery.data?.data
  const src = urlMode
    ? (fallbackUrl ?? null)
    : ((selected ? mediaSrc(selected.url) : null) ?? fallbackUrl ?? null)

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
          onDoubleClick={openPicker}
          className={
            fill ? 'h-full min-h-[16rem] w-full object-cover' : 'aspect-[16/9] w-full object-cover'
          }
        />
      ) : null}
      {kind === 'AUDIO' && src ? <audio controls src={src} className="w-full" /> : null}
      <button
        type="button"
        onClick={openPicker}
        onDoubleClick={openPicker}
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
          type={kind}
          selectedIds={picked ? [picked] : []}
          adding={createAsset.isPending || resolvingUrlPick}
          single
          onToggle={(id) => setPicked(id)}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPicked(id)
          }}
          onConfirm={async () => {
            if (!picked) {
              setOpen(false)
              return
            }
            if (urlMode) {
              // urlMode writes a resolved URL, not an assetId — fetch the picked asset's own
              // record for its `url` before applying and closing.
              setResolvingUrlPick(true)
              const result = await pickedAssetQuery.refetch()
              setResolvingUrlPick(false)
              const url = result.data?.data?.url
              if (url) onUrlChange?.(mediaSrc(url) ?? url)
              setOpen(false)
            } else {
              onChange?.(picked)
              setOpen(false)
            }
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
