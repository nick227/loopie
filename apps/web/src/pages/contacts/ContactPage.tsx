import { useParams } from 'react-router-dom'
import { useContact, useContactInteractions } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InteractionRow } from '@/components/contacts/InteractionRow'
import { History } from 'lucide-react'

const LIFECYCLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
  PAST_CUSTOMER: 'Past customer',
  NONE: 'Contact',
}

export function ContactPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const contactQuery = useContact(contactId!)
  const interactionsQuery = useContactInteractions(contactId!)

  if (contactQuery.isLoading) return <Skeleton className="h-48 w-full" />

  const contact = contactQuery.data?.data
  if (!contact) return <p className="text-muted-foreground">Not found.</p>

  const interactions = interactionsQuery.data?.data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{contact.name}</h1>
        <p className="text-xs text-muted-foreground">
          {LIFECYCLE_LABEL[contact.lifecycleStatus ?? 'NONE']}
          {contact.email ? ` · ${contact.email}` : ''}
          {contact.phone ? ` · ${contact.phone}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Details</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Company</p>
            <p>{contact.company ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p>{contact.source ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium">Timeline</p>
        {interactionsQuery.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : interactions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Sends, replies, and form submits land here."
          />
        ) : (
          interactions.map((interaction) => (
            <InteractionRow key={interaction.id} interaction={interaction} />
          ))
        )}
      </div>
    </div>
  )
}
