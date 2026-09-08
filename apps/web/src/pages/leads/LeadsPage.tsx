import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useLeads, type components } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactLink } from '@/components/contacts/ContactLink'
import { useFlatPages } from '@/hooks/useFlatPages'
import { LEAD_STAGE_LABEL } from '@/lib/leadStages'
import { SOURCE_TYPE_LABEL } from '@/lib/sourceTypes'
import { formatDollars } from '@/lib/money'

type Lead = components['schemas']['Lead']

function when(iso: string) {
  return new Date(iso).toLocaleDateString()
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-6 align-top">
        <Link to={`/leads/${lead.id}`} className="block hover:underline underline-offset-4">
          <ContactLink contactId={lead.contactId} className="text-sm font-medium" />
        </Link>
        <p className="text-xs text-muted-foreground">
          Opened {when(lead.openedAt ?? lead.createdAt)}
        </p>
      </td>
      <td className="py-3 pr-6 align-top text-sm">
        {SOURCE_TYPE_LABEL[lead.sourceType] ?? lead.sourceType}
      </td>
      <td className="py-3 pr-6 align-top text-sm">{LEAD_STAGE_LABEL[lead.stage]}</td>
      <td className="py-3 pr-6 align-top text-sm tabular-nums">
        {lead.estimatedValue == null ? '—' : formatDollars(lead.estimatedValue)}
      </td>
      <td className="py-3 align-top text-sm">
        {lead.nextActionNote ? (
          <>
            <p className="truncate">{lead.nextActionNote}</p>
            {lead.nextActionAt ? (
              <p className="text-xs text-muted-foreground">Due {when(lead.nextActionAt)}</p>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}

import { ExportImportActions } from '@/components/ui/ExportImportActions'
import { PageHeader } from '@/components/ui/PageHeader'

export function LeadsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLeads()
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
        title="Leads"
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
          icon={Users}
          title="No leads yet"
          description="Leads created from forms, ads, and messages will show up here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Contact</th>
                <th className="pb-2 pr-6 font-medium">Source</th>
                <th className="pb-2 pr-6 font-medium">Stage</th>
                <th className="pb-2 pr-6 font-medium">Est. value</th>
                <th className="pb-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
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
