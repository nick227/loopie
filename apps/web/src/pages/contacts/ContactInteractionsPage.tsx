import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContact, useContactInteractions } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InteractionRow } from '@/components/contacts/InteractionRow'
import { History } from 'lucide-react'
import { usePageTitle } from '@/lib/headerContext'

// Currently unreachable from any link — ContactPage.tsx's own detail view already shows this
// same data inline via the same useContactInteractions hook. Kept real (not left as a stub)
// since it's a cheap, honest standalone view of the same real data, not a second data model.
export function ContactInteractionsPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const contact = useContact(contactId!)
  const interactions = useContactInteractions(contactId!)

  usePageTitle('Interactions')

  if (contact.isLoading || interactions.isLoading) return <Skeleton className="h-48 w-full" />

  const person = contact.data?.data
  if (!person) return <p className="text-muted-foreground">Not found.</p>

  const items = interactions.data?.data ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link to={`/contacts/${person.id}`} className="hover:underline underline-offset-4">
            {person.name}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Interactions</h1>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No interactions yet"
          description="Emails, texts, calls, and other activity with this contact will show up here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((interaction) => (
            <InteractionRow key={interaction.id} interaction={interaction} />
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => navigate(`/contacts/${person.id}`)}>
        Back to contact
      </Button>
    </div>
  )
}
