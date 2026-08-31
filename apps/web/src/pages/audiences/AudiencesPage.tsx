import { Link } from 'react-router-dom'
import { useAudiences, useCreateAudience } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { List } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

const SUGGESTED = [
  {
    name: 'Recent customers',
    type: 'SAVED_FILTER' as const,
    filter: { hasSaleSinceDays: 30, emailEligible: true },
  },
  {
    name: 'Ad leads that never bought',
    type: 'SAVED_FILTER' as const,
    filter: { adLeadNoPurchase: true },
  },
  {
    name: 'Shopify customers',
    type: 'SAVED_FILTER' as const,
    filter: { provider: 'SHOPIFY' },
  },
]

export function AudiencesPage() {
  const query = useAudiences()
  const items = useFlatPages(query)
  const create = useCreateAudience()

  return (
    <div className="space-y-5">
      <PageHeader
        variant="list"
        title="Audiences"
        description="Live queries over the customer graph — not copied import lists."
      />

      <div className="flex flex-wrap gap-2">
        {SUGGESTED.filter((row) => !items.some((item) => item.name === row.name)).map((row) => (
          <Button
            key={row.name}
            type="button"
            variant="outline"
            disabled={create.isPending}
            onClick={() => create.mutate(row)}
          >
            Add “{row.name}”
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={List}
          title="No audiences yet"
          description="Create a filter for Messages."
        />
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.memberCount ?? 0} people · {item.type}
                </p>
              </div>
              <Link to={`/audiences/${item.id}`} className="text-sm underline underline-offset-4">
                View
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
