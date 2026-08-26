import { CampaignLeadRow } from '@/components/campaigns/CampaignLeadRow'
import type { components } from '@project/sdk'

type CampaignLead = components['schemas']['CampaignLead']

export function CampaignLeads({
  leads,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  leads: CampaignLead[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  return (
    <section id="leads" className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide uppercase">Leads</h2>
      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads yet from this campaign&apos;s ads.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">Contact</th>
                <th className="pb-2 pr-6 font-medium">Source</th>
                <th className="pb-2 pr-6 font-medium">Stage</th>
                <th className="pb-2 pr-6 font-medium">Value</th>
                <th className="pb-2 font-medium">Last</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <CampaignLeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </section>
  )
}
