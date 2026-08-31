import { useState } from 'react'
import { ExternalLink, Image, LayoutTemplate } from 'lucide-react'
import type { components } from '@project/sdk'
import { UniversalRow } from '@/components/ui/UniversalRow'
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
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  READY: 'bg-muted text-muted-foreground',
  RUNNING: 'bg-success/10 text-success',
  PAUSED: 'bg-warning/10 text-warning',
  FAILED: 'bg-destructive/10 text-destructive',
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// One useful performance line, not a dashboard row — same discipline as PageRow's
// submissions/conversion line. Spend and results (LOOPIE's own attribution outcome, the same
// tier PaidRunRow elevates above platform-reported metrics — docs/strategy/03-product-
// principles.md's Ownership Rule) are the two decision-relevant numbers once money has moved;
// views/clicks stay on the entity's own per-run monitoring, not repeated here. Where this runs
// (Pages vs. external platforms) moves to the row's meta line as its own badges, see
// DestinationBadge below.
function buyLine(ad: AdListItem) {
  if (ad.spend) {
    const parts = [`${money(ad.spend)} spent`]
    if (ad.conversions)
      parts.push(`${ad.conversions.toLocaleString()} result${ad.conversions === 1 ? '' : 's'}`)
    return parts.join(' · ')
  }
  if (ad.dailyBudget) return `${money(ad.dailyBudget)}/day budget`
  return 'No buys yet'
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

export function AdRow({ ad }: { ad: AdListItem }) {
  const visual = ad.assets?.find((asset) => asset.type === 'IMAGE' || asset.type === 'VIDEO')
  const status = ad.status ?? 'DRAFT'
  const impressions = ad.impressions ?? 0
  const clicks = ad.clicks ?? 0
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : null

  return (
    <UniversalRow
      density="featured"
      href={`/ads/${ad.id}`}
      state={{ from: 'Advertising', fromTo: '/ads' }}
      leading={<Thumb asset={visual} />}
      title={ad.name}
      subtitle={buyLine(ad)}
      meta={
        <>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground'}`}
          >
            {STATUS[status] ?? status}
          </span>
          {ad.destinations?.map((label) => (
            <DestinationBadge key={label} label={label} />
          ))}
          {impressions > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {impressions.toLocaleString()} impressions
            </span>
          ) : null}
          {ctr !== null ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {ctr}% CTR
            </span>
          ) : null}
        </>
      }
      trailing={`Updated ${relativeTime(ad.updatedAt)}`}
    />
  )
}
