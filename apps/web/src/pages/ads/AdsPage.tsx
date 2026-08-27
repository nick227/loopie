import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdvertisements } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AdRow } from '@/components/ads/AdRow'
import { Image, Plus, Search } from 'lucide-react'

export function AdsPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data, isLoading, isError, refetch } = useAdvertisements()
  const items = data?.data ?? []
  const visible = q
    ? items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
    : items

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Reusable creatives for paid platforms and your pages.
          </p>
        </div>
        <Button onClick={() => navigate('/ads/new')}>
          <Plus size={16} /> New ad
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ads by name..."
            className="border-zinc-200 bg-zinc-50 pl-9 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
          <h2 className="font-semibold">Ads could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your ad library is unavailable.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-sm underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Image}
          title={q ? 'No matching ads' : 'No ads yet'}
          description={
            q ? 'Try adjusting your search.' : 'Create an ad, then run it on a platform or page.'
          }
          action={q ? undefined : { label: 'New ad', onClick: () => navigate('/ads/new') }}
        />
      ) : (
        <div>
          {visible.map((item) => (
            <div key={item.id} className="pb-3">
              <AdRow ad={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
