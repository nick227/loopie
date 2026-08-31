import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { formatBytes, formatDuration, mediaSrc } from '@/lib/media'
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
    <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {asset.type}
    </div>
  )
}

export function MediaCard({
  asset,
  selected,
  onSelect,
  to,
  compact,
}: {
  asset: Asset
  selected?: boolean
  onSelect?: () => void
  to?: string
  compact?: boolean
}) {
  const spec = [
    asset.type,
    asset.widthPx && asset.heightPx ? `${asset.widthPx}×${asset.heightPx}` : null,
    asset.aspectRatio,
    formatDuration(asset.durationMs),
    formatBytes(asset.sizeBytes),
  ]
    .filter(Boolean)
    .join(' · ')

  // The full library page (non-compact) renders through UniversalRow's 'media' density — the
  // shared tile shape every list in the app converges on. The picker's dense `compact` mode keeps
  // its own bespoke markup below: a different interaction (press-to-select inside a modal, not a
  // browsing list) that wasn't part of this convergence.
  if (!compact) {
    const leading = (
      <div className="relative h-full w-full">
        <Preview asset={asset} />
        {asset.aspectRatio ? (
          <span className="absolute top-2 left-2 text-[10px] font-medium tabular-nums tracking-wide bg-zinc-950/80 text-zinc-50 px-1.5 py-0.5">
            {asset.aspectRatio}
          </span>
        ) : null}
      </div>
    )
    if (onSelect) {
      return (
        <UniversalRow
          density="media"
          onClick={onSelect}
          selected={selected}
          leading={leading}
          title={asset.name}
          subtitle={spec}
        />
      )
    }
    return (
      <UniversalRow
        density="media"
        href={to}
        leading={leading}
        title={asset.name}
        subtitle={spec}
      />
    )
  }

  // Only ever reached for compact (the picker) now — the full library page returned above.
  const inner = (
    <>
      <div className="relative bg-muted overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
        <Preview asset={asset} />
        {asset.aspectRatio ? (
          <span className="absolute top-2 left-2 text-[10px] font-medium tabular-nums tracking-wide bg-zinc-950/80 text-zinc-50 px-1.5 py-0.5">
            {asset.aspectRatio}
          </span>
        ) : null}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium">{asset.name}</p>
      </div>
    </>
  )

  const frame = cn(
    'block text-left rounded-lg border overflow-hidden bg-surface transition-colors',
    selected ? 'border-foreground' : 'border-border',
  )

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className={frame}>
        {inner}
      </button>
    )
  }
  if (to) {
    return (
      <Link to={to} className={cn(frame, 'hover:border-foreground/30')}>
        {inner}
      </Link>
    )
  }
  return <div className={frame}>{inner}</div>
}
