import { Link } from 'react-router-dom'
import { ArrowLeft, GitMerge } from 'lucide-react'
import { useContactMatches } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFlatPages } from '@/hooks/useFlatPages'

export function ContactMatchesPage() {
  const query = useContactMatches()
  const items = useFlatPages(query)

  return (
    <div className="space-y-4">
      <Link
        to="/contacts"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} className="mr-1.5" /> Back to Contacts
      </Link>
      <PageHeader
        variant="list"
        title="Contacts Matches"
        description="Ambiguous matches are flagged, never auto-merged by name."
      />
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
