import { useState } from 'react'
import { ExternalLink, Image, LayoutTemplate } from 'lucide-react'
import type { components } from '@project/sdk'
import { UniversalRow, type UniversalRowAccent } from '@/components/ui/UniversalRow'
import { RowSelectCheckbox } from '@/components/ui/RowSelectCheckbox'
import { relativeTime } from '@/components/home/homeFormat'
import { mediaSrc } from '@/lib/media'

type Advertisement = components['schemas']['Advertisement']
type Asset = components['schemas']['Asset']
type AdListItem = Advertisement & {
  status?: 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'FAILED'
  spend?: number
  impressions?: number
  clicks?: number
  conversions?: number
  dailyBudget?: number
  destinations?: string[]
}

const STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  RUNNING: 'Running',
  PAUSED: 'Paused',
  FAILED: 'Failed',
}

// Tint-pair status pill, keyed to the same semantic tokens as everywhere else — a running ad is a
// positive/success state, a failure is destructive, a pause is worth a second look (warning);
// draft/ready are pre-launch and stay neutral rather than claiming a status that hasn't happened.
const STATUS_TONE: Record<string, UniversalRowAccent> = {
  DRAFT: 'neutral',
  READY: 'neutral',
  RUNNING: 'success',
  PAUSED: 'warning',
  FAILED: 'destructive',
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

// Distinguishes LOOPIE-owned delivery (served through a Page's own ad slot — see
// advertisementSummary.ts's runLabel, which already labels a LOOPIE run "Pages") from a
// connected external platform, without splitting them into two visually separate lists — both
// render as the same pill shape, inline together, differing only in icon/tint. Matches the
// Ownership Rule's "LOOPIE owns what it creates directly, connects to what other platforms own"
// distinction (docs/strategy/03-product-principles.md) at row level.
function DestinationBadge({ label }: { label: string }) {
  const owned = label === 'Pages'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        owned ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
      }`}
    >
      {owned ? <LayoutTemplate size={10} /> : <ExternalLink size={10} />}
      {label}
    </span>
  )
}

// Sized and clipped by UniversalRow's leading container — fills it, never dictates its own size.
function Thumb({ asset }: { asset: Asset | undefined }) {
  const [broken, setBroken] = useState(false)
  const src = mediaSrc(asset?.url)

  if (src && !broken) {
    if (asset?.type === 'VIDEO') {
      return <video src={src} className="h-full w-full object-cover" muted playsInline />
    }
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div className="grid h-full w-full place-items-center text-muted-foreground">
      <Image size={22} />
    </div>
  )
}

// Same one-line-performance-takeaway grammar as PageRow's pageInsight — real data only, at most
// one ad ever claims "Best-performing ad" (decided by the caller across the whole collection, the
// same computation AdsCollectionInsights already does for its highlight banner).
function adInsight(ad: AdListItem, isBestPerformer: boolean): string {
  const conversions = ad.conversions ?? 0
  if (conversions > 0 && isBestPerformer) return 'Best-performing ad'
  if (conversions > 0)
    return `${conversions.toLocaleString()} result${conversions === 1 ? '' : 's'} from this ad`
  return 'No results yet'
}

export function AdRow({
  ad,
  selected = false,
  onToggleSelect,
  isBestPerformer = false,
}: {
  ad: AdListItem
  selected?: boolean
  onToggleSelect?: () => void
  isBestPerformer?: boolean
}) {
  const visual = ad.assets?.find((asset) => asset.type === 'IMAGE' || asset.type === 'VIDEO')
  const status = ad.status ?? 'DRAFT'
  const impressions = ad.impressions ?? 0
  const clicks = ad.clicks ?? 0
  const conversions = ad.conversions ?? 0
  const spend = ad.spend ?? 0

  return (
    <UniversalRow
      density="showcase"
      href={`/ads/${ad.id}`}
      state={{ from: 'Advertising', fromTo: '/ads' }}
      selected={selected}
      leading={<Thumb asset={visual} />}
      title={ad.name}
      subtitle={adInsight(ad, isBestPerformer)}
      meta={ad.destinations?.map((label) => (
        <DestinationBadge key={label} label={label} />
      ))}
      trailing={`Updated ${relativeTime(ad.updatedAt)}`}
      status={{ label: STATUS[status] ?? status, tone: STATUS_TONE[status] ?? 'neutral' }}
      viewLink={ad.destinationUrl ? { label: 'Destination', url: ad.destinationUrl } : undefined}
      stats={[
        { value: impressions.toLocaleString(), label: 'impressions' },
        { value: clicks.toLocaleString(), label: 'clicks' },
        { value: conversions.toLocaleString(), label: 'results' },
        { value: money(spend), label: 'spent' },
      ]}
      action={
        onToggleSelect ? (
          <RowSelectCheckbox
            checked={selected}
            label={`Select ${ad.name}`}
            onToggle={onToggleSelect}
          />
        ) : null
      }
    />
  )
}
