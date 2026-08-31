import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useContact, useContactInteractions, type components } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { InteractionRow } from '@/components/contacts/InteractionRow'
import { History, Mail, DollarSign } from 'lucide-react'
import { usePageTitle } from '@/lib/headerContext'

type Interaction = components['schemas']['Interaction']

const LIFECYCLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
  PAST_CUSTOMER: 'Past customer',
  NONE: 'Contact',
}

const MESSAGE_TYPES: Interaction['type'][] = [
  'EMAIL_SENT',
  'TEXT_SENT',
  'SOCIAL_POST_SENT',
  'REPLY',
]
const SALE_TYPES: Interaction['type'][] = ['SALE_RECORDED', 'QUOTE_SENT']

type Tab = 'overview' | 'activity' | 'messages' | 'sales'

function InteractionList({
  interactions,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  interactions: Interaction[]
  loading: boolean
  emptyIcon: typeof History
  emptyTitle: string
  emptyDescription: string
}) {
  if (loading) return <Skeleton className="h-20 w-full" />
  if (interactions.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  }
  return (
    <div className="space-y-2">
      {interactions.map((interaction) => (
        <InteractionRow key={interaction.id} interaction={interaction} />
      ))}
    </div>
  )
}

export function ContactPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const contactQuery = useContact(contactId!)
  const interactionsQuery = useContactInteractions(contactId!)
  usePageTitle(contactQuery.data?.data?.name ?? null)

  if (contactQuery.isLoading) return <Skeleton className="h-48 w-full" />

  const contact = contactQuery.data?.data
  if (!contact) return <p className="text-muted-foreground">Not found.</p>

  const interactions = interactionsQuery.data?.data ?? []
  const provenance = contact.provenance ?? []
  const records = contact.records ?? []

  return (
    <div className="space-y-4">
      {/* Back and the contact's own name are now persistent-header chrome (Shell.tsx's
          ENTITY_ROUTES + usePageTitle) — a page-local back link or title here would duplicate
          them. description carries what the header doesn't: lifecycle/email/phone/revenue. */}
      <PageHeader
        variant="detail"
        description={
          <>
            {LIFECYCLE_LABEL[contact.lifecycleStatus ?? 'NONE']}
            {contact.email ? ` · ${contact.email}` : ''}
            {contact.phone ? ` · ${contact.phone}` : ''}
            {contact.revenue ? ` · $${contact.revenue}` : ''}
          </>
        }
      />

      {/* Entity-local sections (docs/strategy/03-product-principles.md's Singleton/Collection/
          Entity grammar) — different views of this one contact, plain component state rather than
          routes since there's nothing here that needs its own URL or back-stack entry. Messages/
          Sales are real filters of the same interaction stream Activity already shows (Interaction
          has no dollar amount, so Sales reads as real recorded-sale/quote *events*, not a ledger —
          a genuine per-contact Sale list with amounts would need a new contactId filter on
          GET /sales, which doesn't exist yet and is out of scope for this pass). */}
      <EntityTabs<Tab>
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'activity', label: 'Activity' },
          { key: 'messages', label: 'Messages' },
          { key: 'sales', label: 'Sales' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? (
        <div className="space-y-4">
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
        </div>
      ) : tab === 'activity' ? (
        <InteractionList
          interactions={interactions}
          loading={interactionsQuery.isLoading}
          emptyIcon={History}
          emptyTitle="No activity yet"
          emptyDescription="Sends, replies, form submits, and imported purchases land here."
        />
      ) : tab === 'messages' ? (
        <InteractionList
          interactions={interactions.filter((i) => MESSAGE_TYPES.includes(i.type))}
          loading={interactionsQuery.isLoading}
          emptyIcon={Mail}
          emptyTitle="No messages yet"
          emptyDescription="Emails, texts, social posts, and replies with this contact land here."
        />
      ) : (
        <InteractionList
          interactions={interactions.filter((i) => SALE_TYPES.includes(i.type))}
          loading={interactionsQuery.isLoading}
          emptyIcon={DollarSign}
          emptyTitle="No sales yet"
          emptyDescription="Quotes and recorded sales for this contact land here."
        />
      )}
    </div>
  )
}
