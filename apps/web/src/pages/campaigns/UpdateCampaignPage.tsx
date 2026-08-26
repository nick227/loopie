import { Navigate, useParams } from 'react-router-dom'

export function UpdateCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  return <Navigate to={`/campaigns/${campaignId}`} replace />
}
