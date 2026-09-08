import { Link } from 'react-router-dom'
import { DollarSign } from 'lucide-react'
import { useSales, type components } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactLink } from '@/components/contacts/ContactLink'
import { useFlatPages } from '@/hooks/useFlatPages'
import { formatDollars } from '@/lib/money'
import { SOURCE_TYPE_LABEL } from '@/lib/sourceTypes'

type Sale = components['schemas']['Sale']

// Sale.date is a calendar day stored as UTC midnight, not a precise instant — see SalePage's
// identical note.
function saleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' })
}

function SaleRow({ sale }: { sale: Sale }) {
  const reversed = !!sale.reversedAt
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-6 align-top">
        <Link to={`/sales/${sale.id}`} className="block hover:underline underline-offset-4">
          <span
            className={
              reversed
                ? 'text-sm font-medium text-muted-foreground line-through'
                : 'text-sm font-medium'
            }
          >
            {formatDollars(sale.amount)}
          </span>
        </Link>
        <p className="text-xs text-muted-foreground">{saleDate(sale.date)}</p>
      </td>
      <td className="py-3 pr-6 align-top text-sm">
        <ContactLink contactId={sale.contactId} />
      </td>
      <td className="py-3 pr-6 align-top text-sm">
        {SOURCE_TYPE_LABEL[sale.sourceType] ?? sale.sourceType}
      </td>
      <td className="py-3 pr-6 align-top text-sm">{sale.productOrService ?? '—'}</td>
      <td className="py-3 align-top text-sm">
        {reversed ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Reversed
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}

import { ExportImportActions } from '@/components/ui/ExportImportActions'
import { PageHeader } from '@/components/ui/PageHeader'

export function SalesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSales()
  const items = useFlatPages({ data })

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Sales"
        secondaryActions={
          <ExportImportActions
            onExportCsv={() => alert('Export CSV')}
            onExportGoogleSheets={() => alert('Export Google Sheets')}
            onImportCsv={() => alert('Import CSV')}
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No sales yet"
          description="Sales recorded for your contacts will show up here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Amount</th>
                <th className="pb-2 pr-6 font-medium">Contact</th>
                <th className="pb-2 pr-6 font-medium">Source</th>
                <th className="pb-2 pr-6 font-medium">Product / service</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sale) => (
                <SaleRow key={sale.id} sale={sale} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
