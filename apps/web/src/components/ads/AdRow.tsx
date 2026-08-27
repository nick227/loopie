import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Image } from 'lucide-react'
import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
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

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function mediaLine(asset: Asset | undefined) {
  if (!asset) return 'No media'
  const size = asset.widthPx && asset.heightPx ? `${asset.widthPx}×${asset.heightPx}` : null
  return [asset.type, size, asset.aspectRatio].filter(Boolean).join(' · ')
}

function buyLine(ad: AdListItem) {
  const parts: string[] = []
  if (ad.destinations?.length) parts.push(ad.destinations.join(', '))
  if (ad.dailyBudget) parts.push(`${money(ad.dailyBudget)}`)
  if (ad.spend) parts.push(`${money(ad.spend)} spent`)
  if (ad.impressions) parts.push(`${ad.impressions.toLocaleString()} views`)
  if (ad.clicks) parts.push(`${ad.clicks.toLocaleString()} clicks`)
  if (ad.conversions) parts.push(`${ad.conversions.toLocaleString()} results`)
  return parts.join(' · ') || 'No buys yet'
}

function Thumb({ asset }: { asset: Asset | undefined }) {
  const [broken, setBroken] = useState(false)
  const src = mediaSrc(asset?.url)

  if (src && !broken) {
    if (asset?.type === 'VIDEO') {
      return (
        <video src={src} className="h-full min-h-[120px] w-full object-cover" muted playsInline />
      )
    }
    return (
      <img
        src={src}
        alt=""
        className="h-full min-h-[120px] w-full object-cover"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 text-zinc-400">
      <Image size={24} />
      <span className="text-[10px] font-semibold uppercase tracking-wider">No media</span>
    </div>
  )
}

export function AdRow({ ad }: { ad: AdListItem }) {
  const visual = ad.assets?.find((asset) => asset.type === 'IMAGE' || asset.type === 'VIDEO')
  const editor = `/ads/${ad.id}`
  const status = ad.status ?? 'DRAFT'

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <CardContent className="flex flex-col items-stretch p-0 sm:flex-row">
        <div className="flex min-h-[120px] w-full shrink-0 items-center justify-center overflow-hidden border-r border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:w-48">
          <Thumb asset={visual} />
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={editor} className="hover:underline">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {ad.name}
                </h3>
              </Link>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {STATUS[status] ?? status}
                </span>
                <span className="truncate text-xs text-zinc-500">{mediaLine(visual)}</span>
              </div>
            </div>
            <Link
              to={editor}
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-zinc-500 hover:bg-accent hover:text-zinc-900"
            >
              Edit
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">{buyLine(ad)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
