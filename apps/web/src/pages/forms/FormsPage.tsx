import { useForms } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { List } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'

export function FormsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useForms()
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
      <h1 className="text-xl font-semibold">Forms</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={List}
          title="Nothing here yet"
          description="Items will appear here once created."
        />
      ) : (
        <VirtualInfiniteList
          items={items}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          renderItem={(item) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                {/* TODO: replace with real fields */}
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        />
      )}
    </div>
  )
}
