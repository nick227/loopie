import { useLandingPageTemplates } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { List } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function LandingPageTemplatesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLandingPageTemplates()
  const items = useFlatPages({ data: data })

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Landing Page Templates</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={List}
          title="Nothing here yet"
          description="Items will appear here once created."
        />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <CardContent className="py-4">
              {/* TODO: replace with real fields */}
              <pre className="text-xs text-muted-foreground overflow-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
