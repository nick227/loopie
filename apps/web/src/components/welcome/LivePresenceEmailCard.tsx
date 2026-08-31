import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { formatCount } from '@/components/home/homeFormat'
import type { LivePresenceCardData } from './livePresenceCardTypes'

// A narrow document, not a photo — email has no thumbnail to show, so the card commits to that
// honestly instead of filling the space with a stock icon tile. Simulated body lines read as
// "this is a written piece" purely through silhouette; a bottom fade (which lifts on hover) hints
// there's more copy below, the email equivalent of the Page card's scroll-peek.
export function LivePresenceEmailCard({
  item,
  className,
}: {
  item: LivePresenceCardData
  className?: string
}) {
  return (
    <Link
      to={item.href}
      className={`group flex h-72 flex-col overflow-hidden rounded-xl border border-border bg-surface ${className ?? ''}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Mail size={11} /> {item.statusLabel}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pt-3">
        <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
        <div className="mt-2.5 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-border" />
          <div className="h-1.5 w-5/6 rounded-full bg-border" />
          <div className="h-1.5 w-full rounded-full bg-border" />
          <div className="h-1.5 w-2/3 rounded-full bg-border" />
          <div className="h-1.5 w-full rounded-full bg-border" />
          <div className="h-1.5 w-4/5 rounded-full bg-border" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent transition-opacity duration-500 group-hover:opacity-30" />
      </div>
      <div className="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {formatCount(item.stat1.value)} {item.stat1.label} · {formatCount(item.stat2.value)}{' '}
        {item.stat2.label}
      </div>
    </Link>
  )
}
