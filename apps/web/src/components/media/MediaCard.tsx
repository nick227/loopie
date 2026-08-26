import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { formatBytes, formatDuration, mediaSrc, PLACEMENT_LABEL } from '@/lib/media'
import { cn } from '@/lib/utils'

type Asset = components['schemas']['Asset']

function Preview({ asset }: { asset: Asset }) {
  const src = mediaSrc(asset.url)

  if (asset.type === 'TEXT') {
    return (
      <div className="flex h-full items-end p-3">
        <p className="text-xs leading-relaxed line-clamp-5 font-serif">{asset.textContent}</p>
      </div>
    )
  }
  if (src && asset.type === 'IMAGE') {
    return <img src={src} alt="" className="h-full w-full object-cover" />
  }
  if (src && asset.type === 'VIDEO') {
    return <video src={src} className="h-full w-full object-cover" muted playsInline />
  }
  return (
    <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.16em] text-zinc-400">
      {asset.type}
    </div>
  )
}

export function MediaCard({
  asset,
  selected,
  onSelect,
  to,
}: {
  asset: Asset
  selected?: boolean
  onSelect?: () => void
  to?: string
}) {
  const spec = [
    asset.widthPx && asset.heightPx ? `${asset.widthPx}×${asset.heightPx}` : null,
    asset.aspectRatio,
    formatDuration(asset.durationMs),
    formatBytes(asset.sizeBytes),
  ]
    .filter(Boolean)
    .join(' · ')

  const inner = (
    <>
      <div
        className="relative bg-zinc-100 dark:bg-zinc-900 overflow-hidden"
        style={{
          aspectRatio:
            asset.widthPx && asset.heightPx ? `${asset.widthPx} / ${asset.heightPx}` : '1 / 1',
        }}
      >
        <Preview asset={asset} />
        {asset.aspectRatio ? (
          <span className="absolute top-2 left-2 text-[10px] font-medium tabular-nums tracking-wide bg-zinc-950/80 text-zinc-50 px-1.5 py-0.5">
            {asset.aspectRatio}
          </span>
        ) : null}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium truncate">{asset.name}</p>
        {spec ? <p className="text-[11px] text-zinc-500 tabular-nums truncate">{spec}</p> : null}
        {asset.placements.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {asset.placements.map((id) => (
              <span
                key={id}
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                {PLACEMENT_LABEL[id] ?? id}
              </span>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-zinc-500">
          {asset.usedInAds} {asset.usedInAds === 1 ? 'ad' : 'ads'}
          {asset.usedInTemplates > 0
            ? ` · ${asset.usedInTemplates} ${asset.usedInTemplates === 1 ? 'template' : 'templates'}`
            : ''}
        </p>
      </div>
    </>
  )

  const frame = cn(
    'block text-left rounded-lg border overflow-hidden bg-white dark:bg-zinc-950 transition-colors',
    selected ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-800',
  )

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={frame}>
        {inner}
      </button>
    )
  }
  if (to) {
    return (
      <Link to={to} className={cn(frame, 'hover:border-zinc-400 dark:hover:border-zinc-600')}>
        {inner}
      </Link>
    )
  }
  return <div className={frame}>{inner}</div>
}
