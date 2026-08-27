import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLandingPages } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LayoutTemplate, Plus, Search } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { PageRow } from './components/PageRow'

export function LandingPagesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLandingPages()
  const items = useFlatPages({ data })
  const visible = q
    ? items.filter((page) => page.name.toLowerCase().includes(q.toLowerCase()))
    : items

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pages</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Hosted destinations. Create a page, then edit it.
          </p>
        </div>
        <Link
          to="/landing-pages/new"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} /> New page
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages by name..."
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={q ? 'No matching pages' : 'No pages yet'}
          description={
            q
              ? 'Try adjusting your search.'
              : 'Create a page, then edit layout, theme, and the form.'
          }
          action={
            q ? undefined : { label: 'New page', onClick: () => navigate('/landing-pages/new') }
          }
        />
      ) : (
        <VirtualInfiniteList
          items={visible}
          hasNextPage={!q && !!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          estimateSize={148}
          renderItem={(page) => (
            <div key={page.id} className="pb-3">
              <PageRow page={page} />
            </div>
          )}
        />
      )}
    </div>
  )
}
