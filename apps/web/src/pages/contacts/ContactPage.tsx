import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useContact,
  useContactInteractions,
  useCreateContact,
  useUpdateContact,
  type components,
} from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { InteractionRow } from '@/components/contacts/InteractionRow'
import { ContactAvatarField } from '@/components/contacts/ContactAvatarField'
import { InlineField } from '@/components/contacts/InlineField'
import { ContactTagPicker } from '@/components/contacts/ContactTagPicker'
import { PendingTagsInput } from '@/components/contacts/PendingTagsInput'
import { ContactNotes } from '@/components/contacts/ContactNotes'
import { ContactSales } from '@/components/contacts/ContactSales'
import { ContactLeadCard } from '@/components/contacts/ContactLeadCard'
import { History, Mail, Phone, Building2, Radar, Sparkles } from 'lucide-react'
import { usePageTitle } from '@/lib/headerContext'
import { cn } from '@/lib/utils'

type Interaction = components['schemas']['Interaction']

const LIFECYCLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
  PAST_CUSTOMER: 'Past customer',
  NONE: 'Contact',
}
// The hero's ambient wash — real signal (where this relationship stands), not decoration for its
// own sake. A flat, very-low-opacity tint rather than a gradient: cheap, safe against every
// existing semantic token, still reads as "warmer" the further along the relationship is.
const LIFECYCLE_WASH: Record<string, string> = {
  LEAD: 'bg-info/[0.05]',
  CUSTOMER: 'bg-success/[0.05]',
  PAST_CUSTOMER: 'bg-muted/40',
  NONE: '',
}

const MESSAGE_TYPES: Interaction['type'][] = [
  'EMAIL_SENT',
  'TEXT_SENT',
  'SOCIAL_POST_SENT',
  'REPLY',
]

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

// A quiet stand-in for ContactLeadCard, same shape/position, shown only pre-save — "same
// container on create, view, and edit" means the structure holds even when there's nothing to
// show yet, not that an unsaved contact fakes activity it doesn't have.
function PendingActivityPlaceholder() {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Marketing activity, notes, and deal history will show up here once you save this contact.
        </p>
      </CardContent>
    </Card>
  )
}

// One surface for creating, viewing, and editing a contact — reached at /contacts/new (create) or
// /contacts/:contactId (view, with every field editable inline). See CLAUDE.md's dated entry: a
// contact is framed as a mini profile — avatar-forward, name as the headline, tags as a bio line —
// and, underneath that, a real work surface exposing the marketing/sales tracking already built
// (ContactLeadCard, notes, sales, activity). Editing never navigates to a separate form; a field
// commits in place, matching the ghost-input pattern PageHeader's editableTitle already
// established for Campaign's header.
export function ContactPage() {
  const { contactId } = useParams<{ contactId?: string }>()
  const isCreate = !contactId
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const contactQuery = useContact(isCreate ? '' : contactId!)
  const interactionsQuery = useContactInteractions(isCreate ? '' : contactId!)
  const updateContact = useUpdateContact()
  const createContact = useCreateContact()

  const [draft, setDraft] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    avatarAssetId: null as string | null,
    tags: [] as string[],
  })

  usePageTitle(isCreate ? 'New contact' : (contactQuery.data?.data?.name ?? null))

  if (!isCreate && contactQuery.isLoading) return <Skeleton className="h-64 w-full" />
  const contact = isCreate ? null : contactQuery.data?.data
  if (!isCreate && !contact) return <p className="text-muted-foreground">Not found.</p>

  const name = isCreate ? draft.name : (contact?.name ?? '')
  const email = isCreate ? draft.email : (contact?.email ?? '')
  const phone = isCreate ? draft.phone : (contact?.phone ?? '')
  const company = isCreate ? draft.company : (contact?.company ?? '')
  const source = isCreate ? draft.source : (contact?.source ?? '')
  const avatarAssetId = isCreate ? draft.avatarAssetId : (contact?.avatarAssetId ?? null)
  const avatarUrl = isCreate ? undefined : contact?.avatarUrl

  async function commitField(
    field: 'name' | 'email' | 'phone' | 'company' | 'source',
    value: string,
  ) {
    if (isCreate) {
      setDraft((d) => ({ ...d, [field]: value }))
      return
    }
    if (field === 'name' && !value) return // required — a blank commit just reverts, no request
    try {
      await updateContact.mutateAsync({
        contactId: contactId!,
        [field]: field === 'name' ? value : value || null,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not update ${field}.`)
    }
  }

  async function setAvatar(assetId: string | null) {
    if (isCreate) {
      setDraft((d) => ({ ...d, avatarAssetId: assetId }))
      return
    }
    try {
      await updateContact.mutateAsync({ contactId: contactId!, avatarAssetId: assetId })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this photo.')
    }
  }

  async function handleCreate() {
    if (!draft.name.trim()) {
      toast.error('Give this contact a name first.')
      return
    }
    try {
      const result = await createContact.mutateAsync({
        name: draft.name.trim(),
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        company: draft.company.trim() || undefined,
        source: draft.source.trim() || undefined,
        avatarAssetId: draft.avatarAssetId ?? undefined,
        tags: draft.tags.length ? draft.tags : undefined,
      })
      toast.success('Contact created')
      navigate(`/contacts/${result.data!.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create this contact.')
    }
  }

  const lifecycleStatus = contact?.lifecycleStatus ?? 'NONE'
  const interactions = interactionsQuery.data?.data ?? []
  const provenance = contact?.provenance ?? []
  const records = contact?.records ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* The profile hero — same approved bespoke-header pattern as ProfilePage (CLAUDE.md's
          frontend design-language audit calls out both as intentional PageHeader exceptions), a
          mini-profile treatment rather than a generic detail header: oversized avatar, name as
          the headline, a bio-style meta line, tags directly under it. */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface/40 p-5 sm:p-8">
        {!isCreate ? (
          <div
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-0', LIFECYCLE_WASH[lifecycleStatus])}
          />
        ) : null}
        <div className="relative flex items-center gap-2 text-muted-foreground">
          <Radar size={14} />
          <p className="text-xs font-medium uppercase tracking-[0.18em]">
            {isCreate ? 'New contact' : LIFECYCLE_LABEL[lifecycleStatus]}
          </p>
        </div>

        <div className="relative mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
          <ContactAvatarField
            name={name || 'New contact'}
            assetId={avatarAssetId}
            avatarUrl={avatarUrl}
            onChange={setAvatar}
            size="xl"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <InlineField
              value={name}
              placeholder="Full name"
              ariaLabel="Contact name"
              onCommit={(v) => commitField('name', v)}
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            />

            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
              <Building2 size={13} className="shrink-0" />
              <InlineField
                value={company}
                placeholder="Company"
                ariaLabel="Company"
                onCommit={(v) => commitField('company', v)}
                className="w-auto max-w-[12rem]"
              />
              <span className="text-border">·</span>
              <InlineField
                value={source}
                placeholder="Source"
                ariaLabel="How you met"
                onCommit={(v) => commitField('source', v)}
                className="w-auto max-w-[10rem]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail size={13} className="shrink-0" />
                <InlineField
                  type="email"
                  value={email}
                  placeholder="Email address"
                  ariaLabel="Email"
                  onCommit={(v) => commitField('email', v)}
                  className="w-auto max-w-[14rem]"
                />
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Phone size={13} className="shrink-0" />
                <InlineField
                  type="tel"
                  value={phone}
                  placeholder="Phone number"
                  ariaLabel="Phone"
                  onCommit={(v) => commitField('phone', v)}
                  className="w-auto max-w-[10rem]"
                />
              </span>
            </div>

            <div className="pt-1">
              {isCreate ? (
                <PendingTagsInput
                  names={draft.tags}
                  onChange={(tags) => setDraft((d) => ({ ...d, tags }))}
                />
              ) : (
                <ContactTagPicker contactId={contactId!} assigned={contact?.tagRefs ?? []} />
              )}
            </div>
          </div>

          {isCreate ? (
            <Button loading={createContact.isPending} onClick={handleCreate} className="shrink-0">
              Create contact
            </Button>
          ) : contact?.revenue ? (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  contact.revenue,
                )}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Marketing/sales work surface — the lead card lives here on create too (as a quiet
          placeholder), same position, same "container," per the unification this page is for. */}
      {isCreate ? (
        <PendingActivityPlaceholder />
      ) : (
        <ContactLeadCard contactId={contactId!} currentLead={contact?.currentLead ?? null} />
      )}

      {!isCreate ? (
        <>
          {/* Entity-local sections (docs/strategy/03-product-principles.md's Singleton/Collection/
              Entity grammar) — different views of this one contact, plain component state rather
              than routes since there's nothing here that needs its own URL or back-stack entry. */}
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
                  <p className="text-sm font-medium">Notes</p>
                </CardHeader>
                <CardContent>
                  <ContactNotes contactId={contactId!} />
                </CardContent>
              </Card>

              {provenance.length > 0 ? (
                <Card>
                  <CardHeader>
                    <p className="text-sm font-medium">Field sources</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
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
              ) : null}

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
            <ContactSales contactId={contactId!} />
          )}
        </>
      ) : null}
    </div>
  )
}
