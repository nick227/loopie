import { Link } from 'react-router-dom'
import { useAutomations } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { List } from 'lucide-react'
import { actionLabel, automationStatusLabel, triggerLabel } from '@/lib/automationCopy'

export function AutomationsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAutomations()
  const items = data?.pages.flatMap((page) => page.data) ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Automations</h1>
        <Link to="/automations/new" className="text-sm text-muted-foreground hover:underline">
          New
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={List}
          title="No automations yet"
          description="Create a follow-up to run after a lead, sale, or message."
        />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/automations/${item.id}`}>
            <Card>
              <CardContent className="py-4 space-y-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {automationStatusLabel(item.isActive)} · {triggerLabel(item.trigger)} →{' '}
                  {actionLabel(item.action)}
                </p>
              </CardContent>
            </Card>
          </Link>
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
