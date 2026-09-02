import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'

// Pure presentational River-post pieces — no dependency on RiverFeedItem or any server shape,
// just plain props. This is the one place the card's visual geometry is defined; RiverFeedCard's
// real AuthorRow/Media wrap these with their own data-shaped concerns (click-through, follow
// state, the Ad badge), and RiverComposerModal's live preview renders the exact same components
// directly, so "what you compose" and "what gets posted" can never visually drift apart.

export const RIVER_MEDIA_MAX_HEIGHT_CLASS = 'max-h-[320px] sm:max-h-[480px]'

export function useIsPortrait(url: string | undefined) {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => setPortrait(img.naturalHeight > img.naturalWidth)
    img.src = url
  }, [url])
  return portrait
}

export function RiverPostMedia({
  images,
  video,
  badge,
}: {
  /** Resolved against VITE_API_URL if relative (mediaSrc is idempotent on an already-absolute
   * URL) — so callers can pass either a raw Asset.url (the composer's own picked assets) or an
   * already-resolved RiverFeedItem media URL (the real posted card) without caring which. */
  images: string[]
  video?: string
  /** An overlay chip (e.g. the "Ad" pill) absolutely positioned over the top-left corner. */
  badge?: ReactNode
}) {
  const singleImage = images.length === 1 ? (mediaSrc(images[0]) ?? undefined) : undefined
  const portrait = useIsPortrait(singleImage)
  const videoSrc = mediaSrc(video) ?? undefined

  if (!video && images.length === 0) return null

  return (
    <div className="relative">
      {videoSrc ? (
        <video
          src={videoSrc}
          controls
          preload="metadata"
          className={cn('w-full rounded-[14px] bg-black', RIVER_MEDIA_MAX_HEIGHT_CLASS)}
        />
      ) : singleImage ? (
        <img
          src={singleImage}
          alt=""
          className={cn(
            'w-full rounded-[14px]',
            RIVER_MEDIA_MAX_HEIGHT_CLASS,
            portrait ? 'bg-muted object-contain' : 'object-cover',
          )}
        />
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 gap-1 overflow-hidden rounded-[14px]',
            RIVER_MEDIA_MAX_HEIGHT_CLASS,
          )}
        >
          {images.slice(0, 4).map((url, i) => (
            <img
              key={url + i}
              src={mediaSrc(url) ?? undefined}
              alt=""
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      )}
      {badge}
    </div>
  )
}

// The flush avatar+name+subtitle row — deliberately no background/border/padding "chip" of its
// own (that's the "detached header" the redesign dropped): it sits directly against whatever
// comes above/below it, at whatever horizontal inset the caller's own padding provides.
export function RiverPostHeaderChrome({
  avatarSrc,
  name,
  subtitle,
  large,
  trailing,
  to,
  onNavigate,
}: {
  avatarSrc?: string | null
  name: string
  subtitle?: ReactNode
  large?: boolean
  trailing?: ReactNode
  /** When set, avatar+name+subtitle link to the business's in-app profile route (`/b/{slug}`) —
   * omitted by the composer's own live preview (nothing to link to yet) and by the real card when
   * the business has no slug yet. Real in-app navigation, not an off-SPA hop — see lib/river.ts's
   * trackRiverProfileVisit for how the old external redirect's one real side effect survives. */
  to?: string
  /** Fired alongside navigation (e.g. the tracked-visit beacon) — never blocks it. */
  onNavigate?: () => void
}) {
  const identity = (
    <>
      <Avatar src={avatarSrc} name={name} size={large ? 'lg' : 'md'} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-semibold text-foreground',
            large ? 'text-xl' : 'text-[15px]',
          )}
        >
          {name}
        </span>
        {subtitle ? (
          <span className={cn('block text-muted-foreground', large ? 'text-sm' : 'text-xs')}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  )

  return (
    <div className="flex items-center gap-3">
      {to ? (
        <Link to={to} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}
      {trailing}
    </div>
  )
}
