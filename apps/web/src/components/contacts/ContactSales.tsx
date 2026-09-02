import { DollarSign } from 'lucide-react'
import { useContactSales, type components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFlatPages } from '@/hooks/useFlatPages'

type ContactSale = components['schemas']['ContactSale']

const SOURCE_LABEL: Record<ContactSale['sourceType'], string> = {
  MESSAGE: 'Message',
  DEPLOYMENT: 'Ad campaign',
  AD_RUN: 'Ad',
  AD_UNIT: 'LOOPIE ad',
  MANUAL: 'Manual',
  IMPORT: 'Imported',
}

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ENGAGED: 'Engaged',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// Sale.date is a calendar day (entered via a date picker, stored as UTC midnight), not a precise
// instant — formatting it in the viewer's local timezone can shift it back a day for anyone west
// of UTC. No Business.timezone concept exists anywhere in this app (see CLAUDE.md's Ad Tracking
// Hardening endDate note), so UTC is the one stable interpretation available here.
function saleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' })
}

function SaleRow({ sale }: { sale: ContactSale }) {
  const reversed = !!sale.reversedAt
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5 text-sm">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span
            className={
              reversed
                ? 'font-semibold text-muted-foreground line-through'
                : 'font-semibold text-foreground'
            }
          >
            {money(sale.amount)}
          </span>
          {reversed ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Reversed
            </span>
          ) : null}
          {sale.lead ? (
            <span className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info">
              {STAGE_LABEL[sale.lead.stage] ?? sale.lead.stage}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {saleDate(sale.date)} · {SOURCE_LABEL[sale.sourceType] ?? sale.sourceType}
          {sale.productOrService ? ` · ${sale.productOrService}` : ''}
        </p>
      </div>
    </div>
  )
}

// "Where did this contact's revenue come from" — the real Sale rows behind Contact.revenue,
// not the Interaction-timeline events (SALE_RECORDED/QUOTE_SENT) the Activity/Messages tabs
// already show, which have no dollar amount. Deliberately read-only: no edit/refund/payment UI
// here — Sale.reversedAt is the one existing "undo" concept and it's exposed via POST /sales/
// {id}/reverse elsewhere, not duplicated on this page.
export function ContactSales({ contactId }: { contactId: string }) {
  const query = useContactSales(contactId)
  const sales = useFlatPages(query)
  const summary = query.data?.pages[0]?.summary

  if (query.isLoading) return <Skeleton className="h-32 w-full" />

  if (sales.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No sales yet"
        description="Recorded sales for this contact will show up here, with where the revenue came from."
      />
    )
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <Card>
          <CardContent className="grid grid-cols-3 gap-4 py-4 text-center sm:text-left">
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {money(summary.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Total revenue</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{summary.saleCount}</p>
              <p className="text-xs text-muted-foreground">
                {summary.saleCount === 1 ? 'Sale' : 'Sales'}
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {summary.lastSaleDate ? saleDate(summary.lastSaleDate) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Last purchase</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {sales.map((sale) => (
          <SaleRow key={sale.id} sale={sale} />
        ))}
      </div>

      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more sales'}
        </button>
      ) : null}
    </div>
  )
}
