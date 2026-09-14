import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  parseContactImport,
  toImportPayload,
  useContacts,
  useCrmCatalog,
  useImportContacts,
  useIntegrations,
  type ContactImportFormat,
  type ContactTagColor,
  type components,
} from '@project/sdk'
import { TAG_COLOR_DOT } from '@/lib/tagColors'
import { ArrowRight, Link2, List, Plus, RefreshCw, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { CrmNav } from '@/pages/crm/CrmNav'
import { ExportImportActions } from '@/components/ui/ExportImportActions'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { SearchFilterBar } from '@/components/ui/SearchFilterBar'
import { UniversalRow, UniversalRowList } from '@/components/ui/UniversalRow'
import { relativeTime } from '@/components/home/homeFormat'
import { mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useFlatPages } from '@/hooks/useFlatPages'
import { ContactTagFilterRow } from '@/components/contacts/ContactTagFilterRow'
import {
  getContactsScrollY,
  setContactsScrollY,
  getContactsSearch,
  setContactsSearch,
  getContactsSourceFilter,
  setContactsSourceFilter,
  getContactsTagIds,
  setContactsTagIds,
  getContactsTagMode,
  setContactsTagMode,
} from '@/lib/contactsNavState'
import { LeadWorkQueue } from '@/components/contacts/LeadWorkQueue'

// Same best-effort approach as Inbox's/Pages'/Advertising's own scroll restore
// (InboxSummaryPage.tsx, LandingPagesPage.tsx, AdsPage.tsx) — retry a few times after mount
// rather than wiring a cross-component "fully loaded" signal for a few hundred milliseconds of
// async data.
function useRestoreContactsScroll() {
  useEffect(() => {
    const target = getContactsScrollY()
    if (target <= 0) return
    const timers = [0, 50, 150, 350, 700].map((delay) =>
      setTimeout(() => window.scrollTo(0, target), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setContactsScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

const SOURCE_STYLES = [
  'border-sky-500/40 text-sky-700 dark:text-sky-300',
  'border-violet-500/40 text-violet-700 dark:text-violet-300',
  'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  'border-amber-500/40 text-amber-700 dark:text-amber-300',
  'border-rose-500/40 text-rose-700 dark:text-rose-300',
] as const

const COMMON_SOURCES = [
  'CSV',
  'HUBSPOT',
  'SALESFORCE',
  'SHOPIFY',
  'WOOCOMMERCE',
  'SQUARE',
  'PIPEDRIVE',
  'website',
  'campaign',
  'landing-page',
]

// The finest-grained "where's this relationship at" signal available on the Contact list
// endpoint itself — Lead.stage (New/Qualified/Won/...) isn't joined in here, only this coarser,
// always-present derived status. Tint-pair pill, same convention as AdRow/PageRow: a customer is
// a positive/success state, a lead is still in motion (info), past-customer and plain contacts
// stay neutral.
const LIFECYCLE_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
  PAST_CUSTOMER: 'Past customer',
  NONE: 'Contact',
}
const LIFECYCLE_STYLE: Record<string, string> = {
  LEAD: 'bg-info/10 text-info',
  CUSTOMER: 'bg-success/10 text-success',
  PAST_CUSTOMER: 'bg-muted text-muted-foreground',
  NONE: 'bg-muted text-muted-foreground',
}

function sourceIndex(source?: string | null) {
  const value = source || 'Direct'
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0) % SOURCE_STYLES.length
}

function sourceStyle(source?: string | null) {
  return SOURCE_STYLES[sourceIndex(source)]
}

function sourceLabel(source?: string | null) {
  if (!source) return 'Direct'
  return source
    .replace(/[-_]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// Quietly distinguishes a contact backed by a linked external CRM record (HubSpot, Shopify, a CSV
// import, etc.) from one LOOPIE created directly — real `records` data (ContactSourceRecord[]),
// not a guess from the free-text `source` label above (which mixes acquisition channels like
// "website"/"campaign" with import provenance like "CSV"/"HUBSPOT" in one loosely-typed field).
// Same pill family as the lifecycle badge next to it — a second badge, not a different row shape
// — and renders nothing at all for a native contact, so the common case stays quiet.
function SyncedBadge({ records }: { records?: { provider: string }[] }) {
  if (!records || records.length === 0) return null
  const label =
    records.length === 1 ? sourceLabel(records[0]!.provider) : `${records.length} linked systems`
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <RefreshCw size={10} />
      {label}
    </span>
  )
}

// Up to 2 tag dots inline on the row, +N overflow — enough to signal "this contact is tagged"
// without turning every row into a wall of chips. Full chips (with names) live on the contact
// detail page's ContactTagPicker; the row just needs to be scannable.
function RowTags({ tagRefs }: { tagRefs?: components['schemas']['ContactTagRef'][] }) {
  if (!tagRefs || tagRefs.length === 0) return null
  const shown = tagRefs.slice(0, 2)
  const overflow = tagRefs.length - shown.length
  return (
    <span className="inline-flex items-center gap-1">
      {shown.map((tag) => (
        <span
          key={tag.id}
          title={tag.name}
          className={cn('h-2 w-2 rounded-full', TAG_COLOR_DOT[tag.color as ContactTagColor])}
        />
      ))}
      {overflow > 0 ? <span className="text-[11px] text-muted-foreground">+{overflow}</span> : null}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// A single action, not a page section — opened in a modal on demand rather than sitting on the
// page as a permanent, implementation-oriented drag/drop block.
function ContactImport({ onDone }: { onDone: () => void }) {
  const mutation = useImportContacts()
  const [dragging, setDragging] = useState(false)

  async function importFile(file: File) {
    try {
      const format: ContactImportFormat = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv'
      const parsed = parseContactImport(await file.text(), format)
      if (!('rows' in parsed) || parsed.rows.length === 0) {
        throw new Error('No contacts found in this file.')
      }
      const result = await mutation.mutateAsync({ contacts: toImportPayload(parsed.rows) })
      const counts = result.data
      if (!counts) throw new Error('Import did not return a result.')
      toast.success(`${counts.created} new contact${counts.created === 1 ? '' : 's'} added`)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'This file could not be imported.')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add a CSV or JSON file. Existing contacts are linked automatically.
      </p>
      <label
        className={cn(
          'group flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-4 text-center transition-colors',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          dragging
            ? 'border-primary ring-1 ring-primary'
            : 'border-input-border hover:border-foreground/40',
          mutation.isPending && 'pointer-events-none opacity-60',
        )}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) void importFile(file)
        }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 text-primary transition-transform group-hover:-translate-y-0.5">
          <UploadCloud size={18} />
        </span>
        <span className="text-left">
          <span className="block text-sm font-medium">Drop a contact file here</span>
          <span className="block text-xs text-muted-foreground">or click to choose</span>
        </span>
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          disabled={mutation.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
            event.target.value = ''
          }}
        />
      </label>
      {mutation.isPending ? <p className="text-xs text-muted-foreground">Importing…</p> : null}
    </div>
  )
}

// Contacts is a consumer of connected-provider data, not a provider-management surface — see
// the 2026-09-14 /connections consolidation. This used to be a full second Connect/Reconnect/
// Disconnect/Pause/Sync modal (ConnectIntegrationsButton) duplicating everything /connections
// already does; that's exactly the drift a second canonical surface creates, so it's gone.
// What's left: an always-visible, obvious link to /connections (the actual management surface),
// plus a contextual shortcut straight into Google Sheets' source-picker when it's already
// connected — Contacts uses connected data, it doesn't configure providers.
function ConnectionsPrompt() {
  const list = useIntegrations()
  const catalog = useCrmCatalog()
  const connected = useFlatPages(list)
  const googleSheets = connected.find(
    (row) => row.provider === 'GOOGLE_SHEETS' && row.status === 'CONNECTED',
  )
  const hasAnyConnection = connected.some((row) => row.status === 'CONNECTED')
  const matchCount = catalog.data?.unresolvedMatchCount ?? 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {googleSheets ? (
        <Link to={`/integrations/${googleSheets.id}/google-sheets`}>
          <Button variant="outline">
            <Link2 size={15} /> Import from Google Sheets
          </Button>
        </Link>
      ) : null}
      <Link to="/connections">
        <Button variant="outline">
          <Link2 size={15} />
          {hasAnyConnection
            ? 'Connections'
            : 'Connect HubSpot, Shopify, WooCommerce, or Google Sheets'}
        </Button>
      </Link>
      {matchCount > 0 ? (
        <Link
          to="/contact-matches"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Review matches
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
            {matchCount}
          </span>
        </Link>
      ) : null}
    </div>
  )
}

export function ContactsPage() {
  useRestoreContactsScroll()
  const [q, setQState] = useState(getContactsSearch)
  const [source, setSourceState] = useState(getContactsSourceFilter)
  const [tagIds, setTagIdsState] = useState(getContactsTagIds)
  const [tagMode, setTagModeState] = useState(getContactsTagMode)
  const [importOpen, setImportOpen] = useState(false)
  // Persisted through contactsNavState so Back from a Contact entity restores search/filter, same
  // continuity contract as Pages (pagesNavState.ts) and Advertising (adsNavState.ts).
  function setQ(next: string) {
    setQState(next)
    setContactsSearch(next)
  }
  function setSource(next: string) {
    setSourceState(next)
    setContactsSourceFilter(next)
  }
  function setTagIds(next: string[]) {
    setTagIdsState(next)
    setContactsTagIds(next)
  }
  function setTagMode(next: 'AND' | 'OR') {
    setTagModeState(next)
    setContactsTagMode(next)
  }
  const query = useContacts({
    ...(q ? { q } : {}),
    ...(source ? { source } : {}),
    ...(tagIds.length ? { tagIds, tagMode } : {}),
  })
  const items = useFlatPages(query)

  const sources = useMemo(() => {
    const available = new Set<string>()
    items.forEach((contact) => contact.source && available.add(contact.source))
    COMMON_SOURCES.forEach((value) => available.add(value))
    return Array.from(available).sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b)))
  }, [items])

  return (
    <div className="space-y-5">
      {/* Same shared PageHeader/SearchFilterBar/UniversalRowList structure as Advertising and
          Pages (docs/strategy/03-product-principles.md's unified navigation grammar) — Connect/
          Import are real CRM-specific actions, not a reason to diverge from the shared header. */}
      <PageHeader
        variant="list"
        title="Contacts"
        description="Keep your customer relationships, leads, and follow-ups in one place."
        secondaryActions={
          <>
            <ConnectionsPrompt />
            <ExportImportActions
              onImportCsv={() => setImportOpen(true)}
              onExportCsv={() => alert('Export CSV')}
              onExportGoogleSheets={() => alert('Export Google Sheets')}
            />
          </>
        }
        primaryAction={
          <Link
            to="/contacts/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={15} /> Add contact
          </Link>
        }
      />
      <CrmNav />

      <SearchFilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search name or email…' }}
        filters={[
          {
            id: 'source',
            label: 'Filter contacts by source',
            value: source,
            options: [
              { value: '', label: 'All sources' },
              ...sources.map((value) => ({ value, label: sourceLabel(value) })),
            ],
            onChange: setSource,
          },
        ]}
      />

      <ContactTagFilterRow
        selectedIds={tagIds}
        mode={tagMode}
        onChange={setTagIds}
        onModeChange={setTagMode}
      />

      <LeadWorkQueue />

      {query.isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          Contacts could not be loaded.{' '}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={List}
          title={q || source ? 'No matching contacts' : 'No contacts yet'}
          description={
            q || source
              ? 'Clear a filter or try a different search.'
              : 'Add a contact or import a file.'
          }
        />
      ) : (
        <UniversalRowList>
          {items.map((contact) => {
            const activity = contact.lastContactedAt
              ? `Last contact ${relativeTime(contact.lastContactedAt)}`
              : `Added ${relativeTime(contact.createdAt)}`
            return (
              <UniversalRow
                key={contact.id}
                density="featured"
                href={`/contacts/${contact.id}`}
                state={{ from: 'Contacts', fromTo: '/contacts' }}
                leadingShape="circle"
                leading={
                  contact.avatarUrl ? (
                    <img
                      src={mediaSrc(contact.avatarUrl) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        'grid h-full w-full place-items-center border text-base',
                        sourceStyle(contact.source),
                      )}
                    >
                      {initials(contact.name)}
                    </span>
                  )
                }
                title={contact.name}
                subtitle={
                  <>
                    <time
                      dateTime={contact.lastContactedAt ?? contact.createdAt}
                      aria-label={activity}
                    >
                      {activity}
                    </time>{' '}
                    · {sourceLabel(contact.source)}
                  </>
                }
                meta={
                  <>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        LIFECYCLE_STYLE[contact.lifecycleStatus ?? 'NONE'],
                      )}
                    >
                      {LIFECYCLE_LABEL[contact.lifecycleStatus ?? 'NONE']}
                    </span>
                    <SyncedBadge records={contact.records} />
                    <RowTags tagRefs={contact.tagRefs} />
                    {contact.email ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {contact.email}
                      </span>
                    ) : contact.phone ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {contact.phone}
                      </span>
                    ) : null}
                  </>
                }
                trailing={contact.revenue ? formatMoney(contact.revenue) : undefined}
              />
            )
          })}
        </UniversalRowList>
      )}
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="flex w-full items-center justify-center gap-2 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {query.isFetchingNextPage ? (
            'Loading…'
          ) : (
            <>
              Load more <ArrowRight size={14} />
            </>
          )}
        </button>
      ) : null}

      {importOpen ? (
        <Modal title="Import contacts" onClose={() => setImportOpen(false)}>
          <ContactImport onDone={() => setImportOpen(false)} />
        </Modal>
      ) : null}
    </div>
  )
}
