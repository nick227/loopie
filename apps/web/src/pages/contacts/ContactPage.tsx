import { useParams } from 'react-router-dom'
import { useContact, useContactInteractions } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InteractionRow } from '@/components/contacts/InteractionRow'
import { History } from 'lucide-react'
import { CrmNav } from '@/pages/crm/CrmNav'

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
  const provenance = contact.provenance ?? []
  const records = contact.records ?? []

  return (
    <div className="space-y-4">
      <CrmNav />
      <div>
        <h1 className="text-xl font-semibold">{contact.name}</h1>
        <p className="text-xs text-muted-foreground">
          {LIFECYCLE_LABEL[contact.lifecycleStatus ?? 'NONE']}
          {contact.email ? ` · ${contact.email}` : ''}
          {contact.phone ? ` · ${contact.phone}` : ''}
          {contact.revenue ? ` · $${contact.revenue}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Display identity</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Company</p>
            <p>{contact.company ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">First seen</p>
            <p>{contact.source ?? '—'}</p>
          </div>
          {provenance.map((row) => (
            <div key={row.field}>
              <p className="text-xs text-muted-foreground">{row.field}</p>
              <p>
                {row.value} <span className="text-muted-foreground">({row.source})</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {records.length > 0 ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Linked systems</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {records.map((row) => (
              <div key={row.id}>
                <p className="text-muted-foreground">
                  {row.provider} · {row.externalId}
                </p>
                {row.profile && Object.keys(row.profile).length > 0 ? (
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(row.profile).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground">{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Timeline</p>
        {interactionsQuery.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : interactions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Sends, replies, form submits, and imported purchases land here."
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
