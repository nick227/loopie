import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  parseContactImport,
  toImportPayload,
  useContacts,
  useCreateIntegration,
  useCrmCatalog,
  useDisconnectIntegration,
  useImportContacts,
  useIntegrations,
  usePreviewIntegration,
  useStartCrmOAuth,
  useSyncIntegration,
  useUpdateIntegration,
  type ContactImportFormat,
  type ContactTagColor,
  type components,
} from '@project/sdk'
import { TAG_COLOR_DOT } from '@/lib/tagColors'
import { ArrowRight, Check, Link2, List, Plus, RefreshCw, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
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
import { ContactsCollectionInsights } from './ContactsCollectionInsights'
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

type CrmProvider = {
  provider: string
  label: string
  oauth?: boolean
  configured?: boolean
  availability?: 'LIVE' | 'COMING_SOON'
}
type IntegrationRow = {
  id: string
  provider: string
  status: 'INCOMPLETE' | 'CONNECTED' | 'NEEDS_REAUTH' | 'PAUSED'
  lastSyncAt?: string | null
  lastSyncCreated?: number | null
  lastSyncLinked?: number | null
  lastSyncAttemptAt?: string | null
  lastSyncError?: string | null
  syncHasMore?: boolean
  webhookUrl?: string | null
}

const INTEGRATION_STATUS_LABEL: Record<IntegrationRow['status'], string> = {
  CONNECTED: 'Connected',
  PAUSED: 'Paused',
  NEEDS_REAUTH: 'Needs reauthorization',
  INCOMPLETE: 'Incomplete',
}
const INTEGRATION_STATUS_STYLE: Record<IntegrationRow['status'], string> = {
  CONNECTED: 'bg-success/10 text-success',
  PAUSED: 'bg-muted text-muted-foreground',
  NEEDS_REAUTH: 'bg-warning/10 text-warning',
  INCOMPLETE: 'bg-muted text-muted-foreground',
}

type ModalView =
  | { kind: 'list' }
  | { kind: 'connect'; provider: CrmProvider }
  | { kind: 'manage'; provider: CrmProvider; row: IntegrationRow }
  | {
      kind: 'preview'
      provider: CrmProvider
      row: IntegrationRow
      preview: {
        newContacts: number
        matchedContacts: number
        duplicates: number
        orders: number
        revenue: number
        truncated: boolean
      }
    }
  | { kind: 'connected'; provider: CrmProvider; created: number; linked: number }
  | { kind: 'webhook'; provider: CrmProvider; url: string; secret: string }

// A single button, in line with Import/Add contact — not a permanent row of provider chips on
// the page. Everything (provider list, connect/disconnect, and per-connection settings) lives
// inside the modal this opens, reached only on demand.
function ConnectIntegrationsButton() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ModalView>({ kind: 'list' })
  const catalog = useCrmCatalog()
  const list = useIntegrations()
  const create = useCreateIntegration()
  const oauth = useStartCrmOAuth()
  const update = useUpdateIntegration()
  const disconnect = useDisconnectIntegration()
  const sync = useSyncIntegration()
  const preview = usePreviewIntegration()
  const connected = useFlatPages(list)

  const [shop, setShop] = useState('')
  const [wooStoreUrl, setWooStoreUrl] = useState('')
  const [wooConsumerKey, setWooConsumerKey] = useState('')
  const [wooConsumerSecret, setWooConsumerSecret] = useState('')

  function close() {
    setOpen(false)
    setView({ kind: 'list' })
  }

  async function connect(provider: CrmProvider) {
    try {
      const isOauth = provider.oauth && provider.configured
      if (isOauth) {
        const started = await oauth.mutateAsync({
          provider: provider.provider as
            'HUBSPOT' | 'SALESFORCE' | 'SHOPIFY' | 'SQUARE' | 'PIPEDRIVE',
          shop: provider.provider === 'SHOPIFY' ? shop : undefined,
        })
        if (!started.data) throw new Error('Missing connection URL.')
        window.location.assign(started.data.url)
        return
      }
      if (provider.provider === 'WEBHOOK') {
        const created = await create.mutateAsync({ provider: 'WEBHOOK' })
        if (!created.data?.webhookUrl || !created.data.webhookSecret) {
          throw new Error('Webhook created, but its one-time credentials were not returned.')
        }
        setView({
          kind: 'webhook',
          provider,
          url: created.data.webhookUrl,
          secret: created.data.webhookSecret,
        })
        return
      }
      if (provider.provider !== 'WOOCOMMERCE') {
        throw new Error(`${provider.label} is not available yet.`)
      }
      const created = await create.mutateAsync({
        provider: 'WOOCOMMERCE',
        storeUrl: wooStoreUrl,
        consumerKey: wooConsumerKey,
        consumerSecret: wooConsumerSecret,
      })
      const row = created.data as IntegrationRow | undefined
      if (!row) throw new Error('Connected, but the integration could not be loaded.')
      const result = await preview.mutateAsync(row.id)
      if (!result.data) throw new Error('The import preview could not be loaded.')
      setView({ kind: 'preview', provider, row, preview: result.data })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect.')
    }
  }

  async function togglePause(row: IntegrationRow, provider: CrmProvider) {
    try {
      await update.mutateAsync({
        integrationId: row.id,
        status: row.status === 'PAUSED' ? 'CONNECTED' : 'PAUSED',
      })
      toast.success(
        row.status === 'PAUSED' ? `${provider.label} resumed` : `${provider.label} paused`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this connection.')
    }
  }

  async function handleDisconnect(row: IntegrationRow, provider: CrmProvider) {
    if (
      !window.confirm(
        `Disconnect ${provider.label}? LOOPIE will stop pulling contacts from it until reconnected.`,
      )
    )
      return
    try {
      await disconnect.mutateAsync(row.id)
      toast.success(`${provider.label} disconnected`)
      setView({ kind: 'list' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect.')
    }
  }

  const matchCount = catalog.data?.unresolvedMatchCount ?? 0

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Link2 size={15} /> Connect
      </Button>

      {open ? (
        <Modal
          title={
            view.kind === 'connect'
              ? `Connect ${view.provider.label}`
              : view.kind === 'webhook'
                ? 'Inbound webhook ready'
                : view.kind === 'connected'
                  ? `${view.provider.label} is connected`
                  : view.kind === 'preview'
                    ? 'Review WooCommerce import'
                    : view.kind === 'manage'
                      ? view.provider.label
                      : 'Connect integrations'
          }
          onClose={close}
        >
          {catalog.isLoading || list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : view.kind === 'connect' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {view.provider.provider === 'WEBHOOK'
                  ? 'Create an authenticated endpoint for a custom site'
                  : `Connect ${view.provider.label} to see its contacts, conversations, and activity here.`}
              </p>
              {view.provider.provider === 'SHOPIFY' ? (
                <input
                  className="flex h-9 w-full rounded-md border border-input-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                  placeholder="Store domain (e.g., myshop.myshopify.com)"
                  autoFocus
                />
              ) : null}
              {view.provider.provider === 'WOOCOMMERCE' ? (
                <div className="space-y-3">
                  <input
                    className="flex h-9 w-full rounded-md border border-input-border bg-transparent px-3 py-1 text-sm"
                    value={wooStoreUrl}
                    onChange={(event) => setWooStoreUrl(event.target.value)}
                    placeholder="https://yourstore.com"
                    aria-label="WooCommerce store URL"
                    autoFocus
                  />
                  <input
                    className="flex h-9 w-full rounded-md border border-input-border bg-transparent px-3 py-1 text-sm"
                    value={wooConsumerKey}
                    onChange={(event) => setWooConsumerKey(event.target.value)}
                    placeholder="Read-only consumer key (ck_…)"
                    aria-label="WooCommerce consumer key"
                  />
                  <input
                    type="password"
                    className="flex h-9 w-full rounded-md border border-input-border bg-transparent px-3 py-1 text-sm"
                    value={wooConsumerSecret}
                    onChange={(event) => setWooConsumerSecret(event.target.value)}
                    placeholder="Consumer secret (cs_…)"
                    aria-label="WooCommerce consumer secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a read-only key. Purchasing does not grant marketing consent.
                  </p>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setView({ kind: 'list' })}>
                  Back
                </Button>
                <Button
                  onClick={() => connect(view.provider)}
                  disabled={
                    (view.provider.provider === 'SHOPIFY' && !shop) ||
                    (view.provider.provider === 'WOOCOMMERCE' &&
                      (!wooStoreUrl || !wooConsumerKey || !wooConsumerSecret)) ||
                    create.isPending ||
                    oauth.isPending ||
                    preview.isPending
                  }
                >
                  {create.isPending || oauth.isPending || preview.isPending
                    ? 'Checking…'
                    : view.provider.provider === 'WOOCOMMERCE'
                      ? 'Preview import'
                      : view.provider.provider === 'WEBHOOK'
                        ? 'Create endpoint'
                        : 'Authenticate'}
                </Button>
              </div>
            </div>
          ) : view.kind === 'webhook' ? (
            <div className="space-y-4 text-sm">
              <p>
                Send JSON from WordPress forms, Zapier, Make, or a custom site to this URL with an{' '}
                <code>Authorization: Bearer …</code> header.
              </p>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Endpoint</p>
                <p className="break-all font-mono text-xs">{view.url}</p>
                <p className="pt-2 text-xs text-warning">
                  Copy this secret now. It will not be shown again.
                </p>
                <p className="break-all font-mono text-xs">{view.secret}</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setView({ kind: 'list' })}>Done</Button>
              </div>
            </div>
          ) : view.kind === 'preview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <strong>{view.preview.newContacts}</strong>
                  <br />
                  <span className="text-muted-foreground">New contacts</span>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <strong>{view.preview.matchedContacts}</strong>
                  <br />
                  <span className="text-muted-foreground">Matched contacts</span>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <strong>{view.preview.duplicates}</strong>
                  <br />
                  <span className="text-muted-foreground">Duplicates</span>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <strong>{view.preview.orders}</strong>
                  <br />
                  <span className="text-muted-foreground">Orders</span>
                </div>
              </div>
              <p className="text-sm">
                Revenue found:{' '}
                <strong>
                  $
                  {view.preview.revenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </p>
              {view.preview.truncated ? (
                <p className="text-xs text-warning">
                  This is only the first capped batch. Import it now, then use Continue sync until
                  the store is current.
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setView({ kind: 'list' })}>
                  Cancel
                </Button>
                <Button
                  disabled={sync.isPending}
                  onClick={async () => {
                    const result = await sync.mutateAsync(view.row.id)
                    setView({
                      kind: 'connected',
                      provider: view.provider,
                      created: result.data?.created ?? 0,
                      linked: result.data?.linked ?? 0,
                    })
                  }}
                >
                  {sync.isPending
                    ? 'Importing…'
                    : view.preview.truncated
                      ? 'Import first batch'
                      : 'Import contacts and orders'}
                </Button>
              </div>
            </div>
          ) : view.kind === 'connected' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                  <Check size={16} />
                </span>
                <p className="text-sm text-foreground">
                  {view.created + view.linked > 0
                    ? `${view.created} new, ${view.linked} linked`
                    : 'Connected — nothing to import yet.'}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setView({ kind: 'list' })}>
                  Done
                </Button>
                <Link
                  to="/contacts"
                  onClick={close}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View activity
                </Link>
              </div>
            </div>
          ) : view.kind === 'manage' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                    INTEGRATION_STATUS_STYLE[view.row.status],
                  )}
                >
                  {INTEGRATION_STATUS_LABEL[view.row.status]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {view.row.lastSyncAt
                  ? `Last synced ${relativeTime(view.row.lastSyncAt)} · ${view.row.lastSyncCreated ?? 0} new, ${view.row.lastSyncLinked ?? 0} linked`
                  : 'Not synced yet.'}
              </p>
              {view.row.webhookUrl ? (
                <p className="break-all rounded-lg border border-border p-3 font-mono text-xs">
                  {view.row.webhookUrl}
                </p>
              ) : null}
              {view.row.lastSyncError ? (
                <p className="text-sm text-destructive">
                  Last attempt failed: {view.row.lastSyncError}
                </p>
              ) : null}
              {view.row.status === 'NEEDS_REAUTH' ? (
                <p className="text-sm text-warning">
                  {view.provider.label} needs to be reauthorized before it can sync again.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    sync.isPending ||
                    view.row.status !== 'CONNECTED' ||
                    view.provider.provider === 'WEBHOOK'
                  }
                  onClick={async () => {
                    try {
                      await sync.mutateAsync(view.row.id)
                      toast.success(`${view.provider.label} synced`)
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Sync failed.')
                    }
                  }}
                >
                  {view.row.syncHasMore ? 'Continue sync' : 'Sync now'}
                </Button>
                {view.row.status === 'CONNECTED' || view.row.status === 'PAUSED' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => togglePause(view.row, view.provider)}
                  >
                    {view.row.status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disconnect.isPending}
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDisconnect(view.row, view.provider)}
                >
                  Disconnect
                </Button>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setView({ kind: 'list' })}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                {(catalog.data?.data ?? []).map((provider) => {
                  const row = (
                    provider.availability === 'LIVE'
                      ? connected.find((item) => item.provider === provider.provider)
                      : undefined
                  ) as IntegrationRow | undefined
                  return (
                    <div
                      key={provider.provider}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{provider.label}</span>
                        {row ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                              INTEGRATION_STATUS_STYLE[row.status],
                            )}
                          >
                            {INTEGRATION_STATUS_LABEL[row.status]}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !row &&
                          (provider.availability !== 'LIVE' ||
                            (Boolean(provider.oauth) && !provider.configured))
                        }
                        onClick={() =>
                          row
                            ? setView({ kind: 'manage', provider, row })
                            : setView({ kind: 'connect', provider })
                        }
                      >
                        {row
                          ? 'Manage'
                          : provider.availability !== 'LIVE'
                            ? 'Coming soon'
                            : provider.oauth && !provider.configured
                              ? 'Unavailable'
                              : 'Connect'}
                      </Button>
                    </div>
                  )
                })}
              </div>
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
          )}
        </Modal>
      ) : null}
    </>
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
      <ContactsCollectionInsights />

      {/* Same shared PageHeader/SearchFilterBar/UniversalRowList structure as Advertising and
          Pages (docs/strategy/03-product-principles.md's unified navigation grammar) — Connect/
          Import are real CRM-specific actions, not a reason to diverge from the shared header. */}
      <PageHeader
        variant="list"
        title="Contacts"
        secondaryActions={
          <>
            <ConnectIntegrationsButton />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import
            </Button>
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

      {/* The default CRM landing experience (CLAUDE.md's work-queue slice) — sits above the
          searchable full list below, which stays for browsing/finding anyone, not just today's
          actionable set. */}
      <div className="rounded-2xl border border-border bg-surface p-2">
        <LeadWorkQueue />
      </div>

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
