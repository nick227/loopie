import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'

export type DiscoveryBusiness = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

// The "discovery interlude" — a grouped grid of business profiles inserted every ~6 organic
// posts to break up River's monotony (see the "River design critique" pass, revised by the dated
// "River presentation quality" note). Round 2 still read like a settings widget: bordered
// horizontal list rows are exactly the "choose an account" pattern, not an editorial one. This
// pass drops every border (no module frame, no per-tile border), goes portrait — a large avatar
// with the name below it, centered, like a magazine's "people to know" spread rather than a menu
// list — and leans on a bolder heading to do the "this is a distinct moment" work a full-width
// rule used to. Still a 2×2 grid, still built entirely from businesses already seen in the
// scrolled feed (RiverPage collects them as it flattens pages) — no separate discovery/
// recommendation endpoint, so it can never show a business the reader didn't just see post, and
// it's naturally skipped rather than rendered half-empty when there aren't enough yet (see
// RiverPage's buildFeedRows).
export function RiverDiscoveryModule({ businesses }: { businesses: DiscoveryBusiness[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Discover on River
      </p>
      <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        Businesses active on River
      </h3>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {businesses.slice(0, 4).map((business) => (
          <Link
            key={business.id}
            to={`/b/${business.slug}`}
            className="flex flex-col items-center gap-2.5 rounded-2xl px-3 py-5 text-center transition-colors hover:bg-accent/50"
          >
            <Avatar
              src={business.logoUrl}
              name={business.name}
              size="lg"
              className="h-16 w-16 text-lg"
            />
            <span className="line-clamp-2 text-sm font-semibold text-foreground">
              {business.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
