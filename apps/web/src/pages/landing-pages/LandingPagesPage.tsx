import { Link } from 'react-router-dom'
import { useLandingPages } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LayoutTemplate, Plus } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

export function LandingPagesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLandingPages()
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Landing Pages</h1>
        <Link to="/landing-pages/new">
          <Button size="sm">
            <Plus size={14} /> New
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No landing pages yet"
          description="Create one to capture leads from a campaign or ad."
          action={{
            label: 'New Landing Page',
            onClick: () => (window.location.href = '/landing-pages/new'),
          }}
        />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/landing-pages/${item.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">/p/{item.slug}</p>
                </div>
                <span className="text-xs rounded-full px-2 py-1 bg-accent text-accent-foreground shrink-0">
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
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
