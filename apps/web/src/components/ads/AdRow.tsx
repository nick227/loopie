import { Link } from 'react-router-dom'
import { Image } from 'lucide-react'
import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { mediaSrc } from '@/lib/media'

type Advertisement = components['schemas']['Advertisement']

function Thumb({ url, type }: { url: string | null | undefined; type?: string }) {
  const src = mediaSrc(url)
  if (!src) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-zinc-400">
        <Image size={24} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">No media</span>
      </div>
    )
  }
  if (type === 'VIDEO') {
    return (
      <video src={src} className="h-full w-full min-h-[120px] object-cover" muted playsInline />
    )
  }
  return <img src={src} alt="" className="h-full w-full min-h-[120px] object-cover" />
}

export function AdRow({ ad }: { ad: Advertisement }) {
  const visual = ad.assets?.find((asset) => asset.type === 'IMAGE' || asset.type === 'VIDEO')

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <CardContent className="flex flex-col items-stretch p-0 sm:flex-row">
        <div className="flex w-full shrink-0 items-center justify-center overflow-hidden bg-zinc-100 sm:w-48 dark:bg-zinc-900">
          <Thumb url={visual?.url} type={visual?.type} />
        </div>
        <div className="flex flex-1 items-start justify-between gap-4 p-5">
          <div>
            <Link to={`/ads/${ad.id}`} className="hover:underline">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{ad.name}</h3>
            </Link>
            <p className="mt-1.5 text-sm text-zinc-500">
              {visual?.aspectRatio ?? visual?.type ?? 'No media'}
            </p>
          </div>
          <Link
            to={`/ads/${ad.id}`}
            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-zinc-500 hover:bg-accent hover:text-zinc-900"
          >
            Edit
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
