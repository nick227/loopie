import { Link, useParams } from 'react-router-dom'
import { useCampaign, useCampaignLeads } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { CampaignLeadRow } from '@/components/campaigns/CampaignLeadRow'
import { UserRound } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CampaignLeadsPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const leadsQuery = useCampaignLeads(campaignId!)

  const campaign = campaignQuery.data?.data
  const leads = useFlatPages(leadsQuery)

  if (campaignQuery.isLoading || leadsQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <p className="text-xs text-muted-foreground">
        Outcomes from this campaign. Open a contact to see the timeline.
      </p>

      {leads.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No leads yet"
          description="Leads attributed to this campaign's ads will show up here."
        />
      ) : (
        leads.map((lead) => (
          <Link key={lead.id} to={`/contacts/${lead.contactId}`}>
            <CampaignLeadRow lead={lead} />
          </Link>
        ))
      )}

      {leadsQuery.hasNextPage && (
        <button
          onClick={() => leadsQuery.fetchNextPage()}
          disabled={leadsQuery.isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {leadsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
