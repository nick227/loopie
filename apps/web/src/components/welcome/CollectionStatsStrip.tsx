// A quiet, real-numbers-only summary line — used standalone by Contacts and Messages (a person is
// a row, a conversation is a row — never a media card) and alongside a featured card by
// Advertising (from the same visual grammar Live Presence uses). Pages uses its own richer
// icon-tile insights panel instead — see PagesCollectionInsights.tsx.
export function CollectionStatsStrip({ stats }: { stats: { value: string; label: string }[] }) {
  if (stats.length === 0) return null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 overflow-hidden rounded-xl border border-border bg-surface px-3 py-2.5 sm:gap-x-5 sm:px-4 sm:py-3">
      {stats.map((stat, i) => (
        <span key={i} className="text-xs sm:text-sm">
          <span className="font-semibold tabular-nums text-foreground">{stat.value}</span>{' '}
          <span className="text-muted-foreground">{stat.label}</span>
        </span>
      ))}
    </div>
  )
}
