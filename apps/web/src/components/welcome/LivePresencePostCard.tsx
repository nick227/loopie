import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { formatCount } from '@/components/home/homeFormat'
import type { LivePresenceCardData } from './livePresenceCardTypes'

// A social tile, square and media-first — the caption lives as an overlay at the bottom of the
// frame instead of underneath it, the way a real social grid reads. Sits in a horizontally-
// scrolling strip (LivePresenceGrid.tsx), so this card only ever needs to define its own width,
// not a grid track.
export function LivePresencePostCard({ item }: { item: LivePresenceCardData }) {
  return (
    <Link
      to={item.href}
      className="group relative aspect-square w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:w-44"
    >
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <Share2 size={26} />
        </div>
      )}
      <span className="absolute right-2 top-2 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
        {item.statusLabel}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-2.5 pt-7">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
          {item.title}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatCount(item.stat1.value)} {item.stat1.label}
        </p>
      </div>
    </Link>
  )
}
