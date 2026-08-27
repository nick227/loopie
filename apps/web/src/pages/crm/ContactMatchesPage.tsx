import { Link } from 'react-router-dom'
import { useContactMatches } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { GitMerge } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CrmNav } from './CrmNav'

export function ContactMatchesPage() {
  const query = useContactMatches()
  const items = useFlatPages(query)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ambiguous matches are flagged, never auto-merged by name.
        </p>
      </div>
      <CrmNav />
      {query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title="No records to review"
          description="Imports and syncs that cannot be matched uniquely will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    {row.provider} · {row.externalId}
                  </p>
                  <p className="text-sm text-muted-foreground">{row.matchStatus}</p>
                </div>
                {row.contactId ? (
                  <Link
                    to={`/contacts/${row.contactId}`}
                    className="text-sm underline underline-offset-4"
                  >
                    View contact
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
