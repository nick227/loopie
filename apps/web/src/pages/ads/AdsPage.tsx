import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { ApiError, useAdvertisements, useDeleteAdvertisement } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { BulkSelectionBar } from '@/components/ui/BulkSelectionBar'
import { AdRow } from '@/components/ads/AdRow'
import { Image, Plus } from 'lucide-react'
import { AdsCollectionInsights } from './AdsCollectionInsights'
import { useListSelection } from '@/hooks/useListSelection'
import {
  getAdsScrollY,
  setAdsScrollY,
  getAdsSearch,
  getAdsStatusFilter,
  setAdsStatusFilter,
} from '@/lib/adsNavState'

// Same best-effort approach as Inbox's/Pages' own scroll restore (InboxSummaryPage.tsx,
// LandingPagesPage.tsx) — retry a few times after mount rather than wiring a cross-component
// "fully loaded" signal for a few hundred milliseconds of async data.
function useRestoreAdsScroll() {
  useEffect(() => {
    const target = getAdsScrollY()
    if (target <= 0) return
    const timers = [0, 50, 150, 350, 700].map((delay) =>
      setTimeout(() => window.scrollTo(0, target), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setAdsScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

export function AdsPage() {
  useRestoreAdsScroll()
  const navigate = useNavigate()
  const deleteAd = useDeleteAdvertisement()
  const selection = useListSelection()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [q] = useState(getAdsSearch)
  const [status, setStatusState] = useState(getAdsStatusFilter)
  // Persisted through adsNavState so Back from an Ad entity restores search/filter, same
  // continuity contract as Pages (pagesNavState.ts) and Inbox (inboxNavState.ts).
  function setStatus(next: string) {
    setStatusState(next)
    setAdsStatusFilter(next)
  }
  const { data, isLoading, isError, refetch } = useAdvertisements()
  const items = data?.data ?? []

  let visible = items
  if (q) {
    visible = visible.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
  }
  if (status) {
    visible = visible.filter((item) => item.status === status)
  }

  const statuses = ['DRAFT', 'READY', 'RUNNING', 'PAUSED', 'FAILED']
  const visibleIds = visible.map((item) => item.id)
  // Same "top = highest conversions" computation AdsCollectionInsights already does for its
  // highlight banner — reused here so at most one row's insight line claims "Best-performing ad".
  const topAd = [...items].sort((a, b) => (b.conversions ?? 0) - (a.conversions ?? 0))[0]
  const bestAdId = topAd && (topAd.conversions ?? 0) > 0 ? topAd.id : null

  async function handleBulkDelete() {
    const count = selection.count
    if (count === 0) return
    if (
      !window.confirm(
        `Delete ${count} ad${count === 1 ? '' : 's'}? Ads with live destinations must be ended first.`,
      )
    ) {
      return
    }
    setDeleteError(null)
    setDeleting(true)
    const results = await Promise.allSettled(selection.ids.map((id) => deleteAd.mutateAsync(id)))
    setDeleting(false)
    const failed = results.filter((r) => r.status === 'rejected')
    selection.clear()
    if (failed.length > 0) {
      const first = failed[0]
      const detail =
        first && first.status === 'rejected' && first.reason instanceof ApiError
          ? first.reason.message
          : 'End active destinations, then try again.'
      setDeleteError(
        `${failed.length} of ${count} ad${count === 1 ? '' : 's'} could not be deleted. ${detail}`,
      )
    }
  }

  return (
    <div className="space-y-6">
      <AdsCollectionInsights ads={items} />

      <PageHeader
        variant="list"
        title="Advertising"
        primaryAction={
          <Button onClick={() => navigate('/ads/new')}>
            <Plus size={16} /> New ad
          </Button>
        }
      />

      {deleteError ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}

      <BulkSelectionBar
        count={selection.count}
        totalVisible={visible.length}
        noun="ad"
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
        <div className="space-y-3">
          {visible.map((item) => (
            <AdRow
              key={item.id}
              ad={item}
              selected={selection.isSelected(item.id)}
              onToggleSelect={() => selection.toggle(item.id)}
              isBestPerformer={item.id === bestAdId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
