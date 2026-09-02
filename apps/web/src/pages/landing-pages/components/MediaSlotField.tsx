import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAsset, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'

// Two modes: the default (assetId-backed, uploaded asset library) and urlMode (a plain URL field
// — for templates like Corporate Professional whose media fields store raw external URLs, not
// uploaded assets, per the confirmed decision to extend this component rather than force every
// template onto the asset library). Both share the same double-click-to-edit trigger.
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
  const assetQuery = useAsset(urlMode ? '' : (assetId ?? ''))
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
      {open && urlMode ? (
        <UrlPopover
          url={fallbackUrl ?? ''}
          onClose={() => setOpen(false)}
          onChange={(url) => {
            onUrlChange?.(url)
            setOpen(false)
          }}
        />
      ) : null}
      {open && !urlMode ? (
        <MediaPicker
          type={kind}
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
            if (picked) onChange?.(picked)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

function UrlPopover({
  url,
  onChange,
  onClose,
}: {
  url: string
  onChange: (url: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(url)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onChange(draft)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Enter') onChange(draft)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [draft, onChange, onClose])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Edit image URL"
      className="fixed left-1/2 top-1/2 z-[90] w-80 -translate-x-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-border bg-popover p-3 shadow-lg"
    >
      <label className="block text-xs font-medium text-muted-foreground">
        Image URL
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded border border-input-border bg-transparent px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onChange(draft)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  )
}
