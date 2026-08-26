import { Navigate, useParams } from 'react-router-dom'

export function CampaignBudgetPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  return <Navigate to={`/campaigns/${campaignId}`} replace />
}
