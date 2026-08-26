import { Navigate, useParams } from 'react-router-dom'

export function CampaignLeadsPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  return <Navigate to={`/campaigns/${campaignId}`} replace />
}
