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
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
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
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={cn('grid gap-4', GRID_COLS[stats.length] ?? 'sm:grid-cols-4')}>
        {stats.map((stat, i) => (
          <StatTile key={i} {...stat} />
        ))}
      </div>
      {highlight ? (
        <Link
          to={highlight.href}
          className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <highlight.icon size={14} className="shrink-0 text-primary" />
          <span className="truncate">{highlight.children}</span>
        </Link>
      ) : null}
    </div>
  )
}
