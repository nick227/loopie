import { Navigate, useParams } from 'react-router-dom'

export function CampaignCreateAdUnitPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  return <Navigate to={`/campaigns/${campaignId}`} replace />
}
