import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLandingPages()
  const items = useFlatPages({ data })

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hosted pages you publish ads on and capture leads from.
          </p>
        </div>
        <Link to="/landing-pages/new">
          <Button size="sm">
            <Plus size={14} /> New page
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No pages yet"
          description="Create a page, add ad spaces, and publish. New accounts start with one already live."
          action={{
            label: 'New page',
            onClick: () => navigate('/landing-pages/new'),
          }}
        />
      ) : (
        items.map((item) => (
          <Link key={item.id} to={`/landing-pages/${item.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /p/{item.slug}
                    {item.adSlotCount
                      ? ` · ${item.adSlotCount} ad space${item.adSlotCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
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
