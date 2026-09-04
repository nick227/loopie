import { Image as ImageIcon, Trash2 } from 'lucide-react'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBytes, mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']

export function AdMediaThumb({
  asset,
  loading,
  onChoose,
  onRemove,
}: {
  asset?: Asset | null
  loading?: boolean
  onChoose: () => void
  onRemove: () => void
}) {
  if (loading) {
    return <Skeleton className="h-20 w-full rounded-lg" />
  }

  if (!asset) {
    return (
      <button
        type="button"
        onClick={onChoose}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border border-dashed border-input-border bg-muted/40 px-3 py-3',
          'text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground',
        )}
      >
        <ImageIcon size={18} className="shrink-0" />
        Choose media
      </button>
    )
  }

  const src = mediaSrc(asset.url)
  const label =
    asset.name ||
    (asset.type === 'TEXT' ? 'Text asset' : asset.type === 'VIDEO' ? 'Video' : 'Image')
  const meta = [
    asset.widthPx && asset.heightPx ? `${asset.widthPx} × ${asset.heightPx}` : null,
    formatBytes(asset.sizeBytes),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2">
      <button
        type="button"
        onClick={onChoose}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
        aria-label="Replace media"
      >
        {asset.type === 'VIDEO' && src ? (
          <video src={src} className="h-full w-full object-cover" muted playsInline />
        ) : asset.type === 'IMAGE' && src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase text-muted-foreground">
            {asset.type}
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
        <button
          type="button"
          onClick={onChoose}
          className="mt-0.5 text-xs font-medium text-primary hover:underline"
        >
          Replace
        </button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove media"
      >
        <Trash2 size={14} className="text-destructive" />
      </Button>
    </div>
  )
}
