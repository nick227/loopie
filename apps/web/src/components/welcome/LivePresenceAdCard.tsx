import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCount } from '@/components/home/homeFormat'
import type { LivePresenceCardData } from './livePresenceCardTypes'

const STATUS_TONE: Record<string, string> = {
  Running: 'bg-success/10 text-success',
  Ready: 'bg-muted text-muted-foreground',
  Paused: 'bg-warning/10 text-warning',
  Failed: 'bg-destructive/10 text-destructive',
}

// A compact creative frame — status strip up top, the creative itself, and the two real numbers
// always visible in a bottom bar. No hover-to-reveal: a number that only shows up on hover isn't
// scannable on a dashboard, and it's dead weight on a touch device that has no hover at all.
export function LivePresenceAdCard({ item }: { item: LivePresenceCardData }) {
  return (
    <Link
      to={item.href}
      className="group relative block h-full w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted"
    >
      <div className="absolute inset-0">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Megaphone size={22} />
          </div>
        )}
      </div>
      <span
        className={cn(
          'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
          STATUS_TONE[item.statusLabel] ?? 'bg-muted text-muted-foreground',
        )}
      >
        {item.statusLabel}
      </span>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-2.5 pb-1.5 pt-6">
        <p className="min-w-0 truncate text-xs font-medium text-foreground">{item.title}</p>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-foreground">
          {formatCount(item.stat1.value)}{' '}
          <span className="font-normal text-muted-foreground">{item.stat1.label}</span>
        </span>
      </div>
    </Link>
  )
}
