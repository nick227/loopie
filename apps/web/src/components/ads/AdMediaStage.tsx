import { Image as ImageIcon } from 'lucide-react'
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
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-zinc-500">
      {asset.type}
    </div>
  )
}

export function AdMediaStage({
  asset,
  frameId,
  onFrame,
}: {
  asset: Asset
  frameId: PreviewFrameId
  onFrame: (id: PreviewFrameId) => void
}) {
  const mobile = frameId === 'mobile'

  return (
    <div className="space-y-3">
      {mobile ? (
        <div className="flex justify-center py-2">
          <div className="overflow-hidden rounded-[2.5rem] border-[8px] border-zinc-900 shadow-xl transition-all duration-300">
            <div className="aspect-[9/16] w-56 overflow-hidden">
              <Media asset={asset} />
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl">
          <div className="aspect-video w-full overflow-hidden">
            <Media asset={asset} />
          </div>
        </div>
      )}

      <div className="flex justify-center gap-1">
        {PREVIEW_FRAMES.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onFrame(row.id)}
            className={cn(
              'rounded-md px-3 min-h-11 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs',
              frameId === row.id
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
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
