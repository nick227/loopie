import { Image as ImageIcon, X } from 'lucide-react'
import type { components } from '@project/sdk'
import { mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']

function Media({ asset }: { asset: Asset }) {
  const src = mediaSrc(asset.url)
  if (asset.type === 'VIDEO' && src) {
    return <video src={src} className="h-full w-full object-cover" muted playsInline controls />
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

export const AD_MEDIA_STAGE_HEIGHT = 'min-h-[27rem]'

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

function destinationHost(url: string | undefined) {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// A Feed post's own preview surface — deliberately just the three things a Feed placement
// actually renders (image/video, primary post text, CTA), no desktop/mobile frame toggle. See
// CLAUDE.md's Feed Ad POC pass: the toggle only ever changed how the file cropped, not where the
// ad appeared, so it was dropped rather than reproduced here.
export function AdFeedPreview({
  asset,
  primaryText,
  ctaLabel,
  destinationUrl,
  onRemove,
}: {
  asset: Asset
  primaryText: string
  ctaLabel: string
  destinationUrl: string
  onRemove: () => void
}) {
  const host = destinationHost(destinationUrl)

  return (
    <div className={cn('flex w-full justify-center', AD_MEDIA_STAGE_HEIGHT)}>
      <div
        data-testid="ad-preview"
        className="relative w-full max-w-md self-start overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
      >
        <Remove onRemove={onRemove} />
        {primaryText ? (
          <p className="whitespace-pre-wrap p-4 pr-10 text-sm leading-relaxed">{primaryText}</p>
        ) : null}
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <Media asset={asset} />
        </div>
        {ctaLabel || host ? (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
            <span className="min-w-0 truncate text-xs uppercase tracking-wider text-muted-foreground">
              {host ?? ''}
            </span>
            {ctaLabel ? (
              <span className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
                {ctaLabel}
              </span>
            ) : null}
          </div>
        ) : null}
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
