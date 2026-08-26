import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Image } from 'lucide-react'

type Creative = components['schemas']['Creative']

function Thumb({ url }: { url: string | null | undefined }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) {
    return (
      <div className="flex flex-col items-center gap-2 text-zinc-400">
        <Image size={24} />
        <span className="text-[10px] uppercase font-semibold tracking-wider">No media</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover min-h-[120px]"
      onError={() => setBroken(true)}
    />
  )
}

export function AdRow({ ad }: { ad: Creative }) {
  const ctr = ad.impressions > 0 ? Math.min((ad.clicks / ad.impressions) * 100, 100) : 0

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
        <div className="w-full sm:w-48 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 min-h-[120px] overflow-hidden">
          <Thumb url={ad.previewUrl} />
        </div>

        <div className="flex-1 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Link to={`/ads/${ad.id}`} className="hover:underline">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {ad.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {ad.campaignCount} {ad.campaignCount === 1 ? 'campaign' : 'campaigns'}
                </span>
              </div>
            </div>
            <Link to={`/ads/${ad.id}/edit`}>
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900">
                Edit
              </Button>
            </Link>
          </div>

          <div className="mt-4 max-w-sm">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                {ad.clicks.toLocaleString()} clicks
              </span>
              <span className="text-zinc-500">{ad.impressions.toLocaleString()} views</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                style={{ width: `${ctr}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
