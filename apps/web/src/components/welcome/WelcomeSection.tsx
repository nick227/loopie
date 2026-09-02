import { useHomeSummary } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { BusinessIdentityHeader } from './BusinessIdentityHeader'
import { ResultsPanel } from './ResultsPanel'
import { AddSomethingRow } from './AddSomethingRow'

// Home's own dashboard — no longer repeated on Pages/Advertising/Contacts/Messages (each of those
// now has its own scoped CollectionInsightsPanel instead; see PagesCollectionInsights.tsx and
// siblings). Metrics lead: identity, then the expanded Results table (the numbers a business
// owner actually opens Home to check), then Live presence and a message summary, in that order —
// "maximize top-level metrics insights" over a scrolling activity feed.
export function WelcomeSection() {
  const query = useHomeSummary()

  if (query.isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const home = query.data?.data
  if (query.isError || !home) {
    return (
      <div
        role="alert"
        className="mb-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
      >
        This overview could not be loaded.{' '}
        <button
          type="button"
          onClick={() => query.refetch()}
          className="underline underline-offset-4"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <ResultsPanel weeklyResults={home.weeklyResults} />

      <AddSomethingRow />

      <BusinessIdentityHeader />
    </div>
  )
}
