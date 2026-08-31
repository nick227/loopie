import { Megaphone, Eye, Target, DollarSign, Trophy } from 'lucide-react'
import type { components } from '@project/sdk'
import { CollectionInsightsPanel } from '@/components/welcome/CollectionInsightsPanel'

type Advertisement = components['schemas']['Advertisement']

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

// Advertising-specific highlights, replacing the generic cross-surface WelcomeSection on this
// collection — the same icon-tile metrics panel Pages uses (docs/strategy/03-product-
// principles.md). The former two-up featured-ad preview grid is gone: a small pair of arbitrarily
// -picked creative tiles wasn't insight, and it duplicated the row list immediately below it.
// Real aggregate numbers instead, plus a text-only "top performer" line naming the single best ad
// by results.
export function AdsCollectionInsights({ ads }: { ads: Advertisement[] }) {
  if (ads.length === 0) return null
  const status = ads.map((a) => ({ ad: a, status: a.status ?? 'DRAFT' }))
  const running = status.filter((a) => a.status === 'RUNNING').length
  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions ?? 0), 0)
  const totalSpend = ads.reduce((sum, a) => sum + (a.spend ?? 0), 0)
  const totalConversions = ads.reduce((sum, a) => sum + (a.conversions ?? 0), 0)
  const top = [...ads].sort((a, b) => (b.conversions ?? 0) - (a.conversions ?? 0))[0]
  const best = top && (top.conversions ?? 0) > 0 ? top : null

  return (
    <CollectionInsightsPanel
      stats={[
        { icon: Megaphone, value: String(running), label: `of ${ads.length} running` },
        { icon: Eye, value: String(totalImpressions), label: 'impressions' },
        { icon: Target, value: String(totalConversions), label: 'results' },
        { icon: DollarSign, value: money(totalSpend), label: 'spent' },
      ]}
      highlight={
        best
          ? {
              icon: Trophy,
              href: `/ads/${best.id}`,
              children: (
                <>
                  Top performer: <span className="font-medium text-foreground">{best.name}</span> ·{' '}
                  {best.conversions} result{best.conversions === 1 ? '' : 's'}
                </>
              ),
            }
          : undefined
      }
    />
  )
}
