import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLandingPages } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchFilterBar } from '@/components/ui/SearchFilterBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { LayoutTemplate } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { PageRow } from './components/PageRow'
import { UniversalRowList } from '@/components/ui/UniversalRow'
import { PagesCollectionInsights } from './components/PagesCollectionInsights'
import {
  getPagesScrollY,
  setPagesScrollY,
  getPagesSearch,
  setPagesSearch,
  getPagesStatusFilter,
  setPagesStatusFilter,
} from '@/lib/pagesNavState'

// Same best-effort approach as Inbox's useRestoreInboxScroll (InboxSummaryPage.tsx) — content
// height depends on an async list query, so retry a few times after mount rather than wiring a
// cross-component "fully loaded" signal for a few hundred milliseconds of async data.
function useRestorePagesScroll() {
  useEffect(() => {
    const target = getPagesScrollY()
    if (target <= 0) return
    const timers = [0, 50, 150, 350, 700].map((delay) =>
      setTimeout(() => window.scrollTo(0, target), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setPagesScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

export function LandingPagesPage() {
  useRestorePagesScroll()
  const [q, setQState] = useState(getPagesSearch)
  const [status, setStatusState] = useState(getPagesStatusFilter)
  // Persisted through pagesNavState so Back from a Page entity restores search/filter, same
  // continuity contract as Inbox's own filter (inboxNavState.ts).
  function setQ(next: string) {
    setQState(next)
    setPagesSearch(next)
  }
  function setStatus(next: string) {
    setStatusState(next)
    setPagesStatusFilter(next)
  }
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLandingPages()
  const items = useFlatPages({ data })

  let visible = items
  if (q) {
    visible = visible.filter((page) => page.name.toLowerCase().includes(q.toLowerCase()))
  }
  if (status) {
    visible = visible.filter((page) => page.status === status)
  }

  const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

  return (
    <div className="space-y-6">
      <PagesCollectionInsights pages={items} />

      <PageHeader variant="list" title="Pages" />

      <SearchFilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: 'Search pages by name...',
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatus('')}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
            status === ''
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
          )}
        >
          All statuses
        </button>
        {statuses.map((value) => {
          const isSelected = status === value
          const hasResults = items.some((item) => item.status === value)
          const isDisabled = !hasResults && !isSelected && status === ''

          return (
            <button
              key={value}
              onClick={() => setStatus(value)}
              disabled={isDisabled}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-input-border hover:border-border',
                isDisabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
          <h2 className="font-semibold">Pages could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your live and draft Page state is unavailable.
          </p>
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
          icon={LayoutTemplate}
          title={q ? 'No matching pages' : 'No pages yet'}
          description={
            q
              ? 'Try adjusting your search.'
              : 'Pick a starting point above to create your first page.'
          }
        />
      ) : (
        <UniversalRowList>
          <VirtualInfiniteList
            items={visible}
            hasNextPage={!q && !!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            estimateSize={72}
            renderItem={(page) => <PageRow page={page} />}
          />
        </UniversalRowList>
      )}
    </div>
  )
}
