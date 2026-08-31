import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useAdvertisements } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchFilterBar } from '@/components/ui/SearchFilterBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { AdRow } from '@/components/ads/AdRow'
import { UniversalRowList } from '@/components/ui/UniversalRow'
import { Image, Plus } from 'lucide-react'
import { AdsCollectionInsights } from './AdsCollectionInsights'
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
  const [q, setQState] = useState(getAdsSearch)
  const [status, setStatusState] = useState(getAdsStatusFilter)
  // Persisted through adsNavState so Back from an Ad entity restores search/filter, same
  // continuity contract as Pages (pagesNavState.ts) and Inbox (inboxNavState.ts).
  function setQ(next: string) {
    setQState(next)
    setAdsSearch(next)
  }
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

      <SearchFilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: 'Search ads by name...',
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
        <UniversalRowList>
          {visible.map((item) => (
            <AdRow key={item.id} ad={item} />
          ))}
        </UniversalRowList>
      )}
    </div>
  )
}
