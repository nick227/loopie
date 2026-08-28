import { Image as ImageIcon, X } from 'lucide-react'
import type { components } from '@project/sdk'
import { mediaSrc } from '@/lib/media'
import { PREVIEW_FRAMES, type PreviewFrameId } from '@/lib/adPreview'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']

function Media({ asset }: { asset: Asset }) {
  const src = mediaSrc(asset.url)
  if (asset.type === 'VIDEO' && src) {
    return <video src={src} className="h-full w-full object-cover" muted playsInline />
  }
  if (asset.type === 'IMAGE' && src) {
    return <img src={src} alt="" className="h-full w-full object-cover" />
  }
  if (asset.type === 'TEXT') {
    return (
      <p className="flex h-full items-center p-4 text-sm leading-relaxed">{asset.textContent}</p>
    )
  }
  return (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
      {asset.type}
    </div>
  )
}

export const AD_MEDIA_STAGE_HEIGHT = 'h-[27rem]'

function Remove({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remove"
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-surface-foreground shadow-sm hover:bg-surface"
    >
      <X size={16} />
    </button>
  )
}

export function AdMediaStage({
  asset,
  frameId,
  onFrame,
  onRemove,
}: {
  asset: Asset
  frameId: PreviewFrameId
  onFrame: (id: PreviewFrameId) => void
  onRemove: () => void
}) {
  const mobile = frameId === 'mobile'

  return (
    <div className="space-y-3">
      <div
        data-testid="ad-preview"
        className={cn(
          'flex w-full items-center justify-center overflow-hidden',
          AD_MEDIA_STAGE_HEIGHT,
        )}
      >
        {mobile ? (
          <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-zinc-900 shadow-xl">
            <Remove onRemove={onRemove} />
            <div className="aspect-[9/16] w-56 overflow-hidden">
              <Media asset={asset} />
            </div>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden rounded-xl">
            <Remove onRemove={onRemove} />
            <div className="aspect-video w-full overflow-hidden">
              <Media asset={asset} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-1">
        {PREVIEW_FRAMES.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onFrame(row.id)}
            className={cn(
              'rounded-md px-3 min-h-11 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs',
              frameId === row.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {row.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AdMediaEmpty({ onChoose }: { onChoose: () => void }) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center rounded-xl border border-dashed border-input-border bg-muted/40',
        AD_MEDIA_STAGE_HEIGHT,
      )}
    >
      <button
        type="button"
        onClick={onChoose}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ImageIcon size={18} />
        Choose media
      </button>
    </div>
  )
}
