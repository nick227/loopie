import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, useAdvertisements, useDeleteAdvertisement } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchFilterBar } from '@/components/ui/SearchFilterBar'
import { StatusTabs } from '@/components/ui/StatusTabs'
import { Button } from '@/components/ui/Button'
import { BulkSelectionBar } from '@/components/ui/BulkSelectionBar'
import { AdRow } from '@/components/ads/AdRow'
import { Image, Plus } from 'lucide-react'
import { useListSelection } from '@/hooks/useListSelection'
import {
  getAdsScrollY,
  setAdsScrollY,
  getAdsSearch,
  setAdsSearch,
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
  const [q, setQState] = useState(getAdsSearch)
  const [status, setStatusState] = useState(getAdsStatusFilter)
  // Persisted through adsNavState so Back from an Ad entity restores search/filter, same
  // continuity contract as Pages (pagesNavState.ts) and Inbox (inboxNavState.ts).
  function setStatus(next: string) {
    setStatusState(next)
    setAdsStatusFilter(next)
  }
  function setQ(next: string) {
    setQState(next)
    setAdsSearch(next)
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
  // Keep the strongest ad's useful performance context on its own row rather than in a detached
  // summary surface.
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
    <div className="space-y-5">
      <PageHeader
        variant="list"
        title="Advertising"
        description="Create and manage the ads that bring people to your business."
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

      <div className="space-y-3">
        <SearchFilterBar search={{ value: q, onChange: setQ, placeholder: 'Search ads…' }} />
        <StatusTabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: '', label: 'All', count: items.length },
            ...statuses.map((value) => ({
              value,
              label: value.charAt(0) + value.slice(1).toLowerCase(),
              count: items.filter((item) => item.status === value).length,
            })),
          ]}
        />
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
