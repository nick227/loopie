import type { components } from '@project/sdk'
import { mediaSrc } from '@/lib/media'

type Asset = components['schemas']['Asset']

export function destinationHost(url: string | undefined) {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function truncate(text: string, max: number) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function AdPreviewMedia({
  asset,
  className = 'h-full w-full object-cover',
}: {
  asset?: Asset | null
  className?: string
}) {
  if (!asset) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-xs uppercase tracking-wider text-muted-foreground">
        No media
      </div>
    )
  }
  const src = mediaSrc(asset.url)
  if (asset.type === 'VIDEO' && src) {
    return <video src={src} className={className} muted playsInline controls={false} />
  }
  if (asset.type === 'IMAGE' && src) {
    return <img src={src} alt="" className={className} />
  }
  if (asset.type === 'TEXT') {
    return (
      <p className="flex h-full items-center p-4 text-sm leading-relaxed text-foreground">
        {asset.textContent}
      </p>
    )
  }
  return (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
      {asset.type}
    </div>
  )
}
