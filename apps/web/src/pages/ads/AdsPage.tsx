import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreatives } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { AdRow } from '@/components/ads/AdRow'
import { Image, Plus, Search } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'

export function AdsPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCreatives()
  const items = useFlatPages({ data })
  const visible = q
    ? items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
    : items

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ads</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Reusable library. Attach an ad to a campaign.
          </p>
        </div>
        <Link to="/ads/new">
          <Button>
            <Plus size={16} className="mr-2" /> New ad
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ads by name..."
            className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Image}
          title={q ? 'No matching ads' : 'No ads yet'}
          description={
            q ? 'Try adjusting your search.' : 'Create an ad, then attach it to a campaign.'
          }
          action={
            q ? undefined : { label: 'New ad', onClick: () => (window.location.href = '/ads/new') }
          }
        />
      ) : (
        <div className="space-y-4">
          <VirtualInfiniteList
            items={visible}
            hasNextPage={!q && !!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            estimateSize={148}
            renderItem={(item) => (
              <div key={item.id} className="pb-3">
                <AdRow ad={item} />
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}
