import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDeleteLandingPage, useLandingPages } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { BulkSelectionBar } from '@/components/ui/BulkSelectionBar'
import { LayoutTemplate, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { useListSelection } from '@/hooks/useListSelection'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { PageRow } from './components/PageRow'
import { PagesCollectionInsights } from './components/PagesCollectionInsights'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import {
  getPagesScrollY,
  setPagesScrollY,
  getPagesSearch,
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
  const quickCreate = useQuickCreatePage()
  const deletePage = useDeleteLandingPage()
  const selection = useListSelection()
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [q] = useState(getPagesSearch)
  const [status, setStatusState] = useState(getPagesStatusFilter)
  // Persisted through pagesNavState so Back from a Page entity restores search/filter, same
  // continuity contract as Inbox's own filter (inboxNavState.ts).
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
  const visibleIds = visible.map((page) => page.id)
  // Same "top = highest submissionCount" computation PagesCollectionInsights already does for its
  // highlight banner — reused here so at most one row's insight line claims "Best-performing page".
  const topPage = [...items].sort((a, b) => b.submissionCount - a.submissionCount)[0]
  const bestPageId = topPage && topPage.submissionCount > 0 ? topPage.id : null

  async function handleBulkDelete() {
    const count = selection.count
    if (count === 0) return
    if (
      !window.confirm(
        `Delete ${count} page${count === 1 ? '' : 's'}? This archives them and removes them from the list.`,
      )
    ) {
      return
    }
    setDeleteError(null)
    setDeleting(true)
    const results = await Promise.allSettled(selection.ids.map((id) => deletePage.mutateAsync(id)))
    setDeleting(false)
    const failed = results.filter((r) => r.status === 'rejected').length
    selection.clear()
    if (failed > 0) {
      setDeleteError(
        `${failed} of ${count} page${count === 1 ? '' : 's'} could not be deleted. Try again.`,
      )
    }
  }

  return (
    <div className="space-y-6">
      <PagesCollectionInsights pages={items} />

      <PageHeader
        variant="list"
        title="Pages"
        primaryAction={
          <Button
            loading={quickCreate.isPending}
            onClick={async () => {
              setCreateError(null)
              const result = await quickCreate.create()
              if (!result.ok) setCreateError(result.message)
            }}
          >
            <Plus size={16} /> New page
          </Button>
        }
      />

      {createError ? (
        <p role="alert" className="text-sm text-destructive">
          {createError}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}

      <BulkSelectionBar
        count={selection.count}
        totalVisible={visible.length}
        noun="page"
        deleting={deleting}
        onSelectAll={() => selection.selectAll(visibleIds)}
        onClear={selection.clear}
        onDelete={handleBulkDelete}
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
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
        <VirtualInfiniteList
          items={visible}
          hasNextPage={!q && !!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          estimateSize={172}
          renderItem={(page) => (
            <PageRow
              page={page}
              selected={selection.isSelected(page.id)}
              onToggleSelect={() => selection.toggle(page.id)}
              isBestPerformer={page.id === bestPageId}
            />
          )}
        />
      )}
    </div>
  )
}
