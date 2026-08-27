import { Image as ImageIcon, X } from 'lucide-react'
import type { components } from '@project/sdk'
import { mediaSrc } from '@/lib/media'
import {
  PREVIEW_FRAMES,
  frameBox,
  parseAspectRatio,
  ratioFits,
  type PreviewFrameId,
} from '@/lib/adPreview'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']

function Media({ asset, cover }: { asset: Asset; cover: boolean }) {
  const src = mediaSrc(asset.url)
  const fit = cover ? 'object-cover' : 'object-contain'
  if (asset.type === 'VIDEO' && src) {
    return <video src={src} className={cn('h-full w-full', fit)} muted playsInline controls />
  }
  if (asset.type === 'IMAGE' && src) {
    return <img src={src} alt="" className={cn('h-full w-full', fit)} />
  }
  if (asset.type === 'TEXT') {
    return (
      <p className="flex h-full items-center p-4 text-sm leading-relaxed">{asset.textContent}</p>
    )
  }
  return (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-zinc-500">
      {asset.type}
    </div>
  )
}

export function AdMediaStage({
  asset,
  frameId,
  scale,
  onFrame,
  onScale,
  onRemove,
}: {
  asset: Asset
  frameId: PreviewFrameId
  scale: number
  onFrame: (id: PreviewFrameId) => void
  onScale: (value: number) => void
  onRemove: () => void
}) {
  const mediaRatio = parseAspectRatio(asset.aspectRatio, asset.widthPx, asset.heightPx) ?? 1
  const frame = PREVIEW_FRAMES.find((row) => row.id === frameId) ?? PREVIEW_FRAMES[0]!
  const ratio = frame.ratio ?? mediaRatio
  const box = frameBox(ratio, scale)
  const native = frame.id === 'native'
  const fits = frame.ratio ? ratioFits(mediaRatio, frame.ratio) : true
  const spec = [
    asset.widthPx && asset.heightPx ? `${asset.widthPx}×${asset.heightPx}` : null,
    asset.aspectRatio,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-zinc-950">
        <div className="flex min-h-72 items-center justify-center p-6 sm:min-h-80">
          <div
            className="overflow-hidden bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            style={{ width: box.width, height: box.height }}
          >
            <Media asset={asset} cover={!native} />
          </div>
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 text-[11px] tabular-nums text-white/80">
          <span className="bg-black/70 px-1.5 py-0.5">{native ? 'Native' : frame.id}</span>
          {spec ? <span className="bg-black/70 px-1.5 py-0.5">{spec}</span> : null}
          {native ? null : (
            <span className={cn('px-1.5 py-0.5', fits ? 'bg-emerald-500/80' : 'bg-amber-500/80')}>
              {fits ? 'Fits' : 'Crops'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 inline-flex h-8 items-center gap-1 rounded-md bg-black/70 px-2 text-xs text-white/90 hover:bg-black"
        >
          <X size={14} />
          Remove
        </button>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PREVIEW_FRAMES.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onFrame(row.id)}
            className={cn(
              'shrink-0 rounded-md px-3 min-h-11 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs',
              frameId === row.id
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
            )}
          >
            {row.id === 'native' ? 'Native' : `${row.label} ${row.id}`}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="shrink-0">Size</span>
        <input
          type="range"
          min={0.6}
          max={1.4}
          step={0.05}
          value={scale}
          aria-label="Preview size"
          onChange={(event) => onScale(Number(event.target.value))}
          className="h-11 w-full accent-zinc-900 sm:h-6 dark:accent-zinc-100"
        />
      </label>
    </div>
  )
}

export function AdMediaEmpty({ onChoose }: { onChoose: () => void }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="flex min-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input-border bg-muted/40 text-sm text-muted-foreground hover:border-foreground hover:text-foreground"
    >
      <ImageIcon size={22} />
      Choose media
    </button>
  )
}
