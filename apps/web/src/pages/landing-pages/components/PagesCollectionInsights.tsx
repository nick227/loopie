import { LayoutTemplate, Send, Percent, Rows3, Trophy } from 'lucide-react'
import type { components } from '@project/sdk'
import { CollectionInsightsPanel } from '@/components/welcome/CollectionInsightsPanel'

type LandingPage = components['schemas']['LandingPage']

// Pages-specific highlights, replacing the generic cross-surface WelcomeSection on this
// collection (docs/strategy/03-product-principles.md). A single "featured page" preview card
// read as a poor stand-in for insight — one page picked near-arbitrarily (most-recent-live, not
// best-performing) dominating the space it sat in. Replaced with real aggregate metrics across
// the whole library instead — the numbers a business actually wants a glance at — plus a text-only
// "best performer" line naming the actual top page by submissions, not a media card for it.
export function PagesCollectionInsights({ pages }: { pages: LandingPage[] }) {
  if (pages.length === 0) return null
  const live = pages.filter((p) => p.status === 'PUBLISHED')
  const totalSubmissions = pages.reduce((sum, p) => sum + p.submissionCount, 0)
  const totalFormStarts = pages.reduce((sum, p) => sum + p.formStartCount, 0)
  const conversionRate =
    totalFormStarts > 0 ? Math.round((totalSubmissions / totalFormStarts) * 100) : null
  const totalAdSpaces = pages.reduce((sum, p) => sum + (p.adSlotCount ?? 0), 0)
  const top = [...pages].sort((a, b) => b.submissionCount - a.submissionCount)[0]
  const best = top && top.submissionCount > 0 ? top : null

  return (
    <CollectionInsightsPanel
      stats={[
        { icon: LayoutTemplate, value: String(live.length), label: `of ${pages.length} live` },
        { icon: Send, value: String(totalSubmissions), label: 'submissions' },
        {
          icon: Percent,
          value: conversionRate === null ? '—' : `${conversionRate}%`,
          label: 'form completion',
        },
        {
          icon: Rows3,
          value: String(totalAdSpaces),
          label: `ad space${totalAdSpaces === 1 ? '' : 's'}`,
        },
      ]}
      highlight={
        best
          ? {
              icon: Trophy,
              href: `/landing-pages/${best.id}`,
              children: `${best.name} is your best performer — ${best.submissionCount} submissions`,
            }
          : undefined
      }
    />
  )
}
