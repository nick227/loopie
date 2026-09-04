import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InsightStat = { icon: LucideIcon; value: string; label: string }
export type InsightHighlight = { icon: LucideIcon; href: string; children: React.ReactNode }

const GRID_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

function StatTile({ icon: Icon, value, label }: InsightStat) {
  return (
    <div className="flex min-w-0 items-start gap-2 sm:gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums leading-tight text-foreground sm:text-2xl">
          {value}
        </p>
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      </div>
    </div>
  )
}

// The one shared "fancy metrics bar" every collection page opens with — Pages, Advertising,
// Contacts, and Messages all render this same icon-tile panel (real aggregate numbers from that
// surface's own already-fetched list, never a fabricated stat), optionally followed by a single
// text-only highlight line naming the top-performing item. Deliberately never a media/preview
// card here — a "featured" thumbnail of one arbitrarily-picked item read as poor insight; the
// real content lives in the item rows below, which carry their own larger preview art instead.
export function CollectionInsightsPanel({
  stats,
  highlight,
}: {
  stats: InsightStat[]
  highlight?: InsightHighlight
}) {
  if (stats.length === 0) return null
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-3 sm:rounded-2xl sm:p-5">
      <div
        className={cn(
          'grid grid-cols-2 gap-3 sm:gap-4',
          GRID_COLS[stats.length] ?? 'sm:grid-cols-4',
        )}
      >
        {stats.map((stat, i) => (
          <StatTile key={i} {...stat} />
        ))}
      </div>
      {highlight ? (
        <Link
          to={highlight.href}
          className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground hover:text-foreground sm:mt-4 sm:pt-3 sm:text-sm"
        >
          <highlight.icon size={14} className="shrink-0 text-primary" />
          <span className="truncate">{highlight.children}</span>
        </Link>
      ) : null}
    </div>
  )
}
