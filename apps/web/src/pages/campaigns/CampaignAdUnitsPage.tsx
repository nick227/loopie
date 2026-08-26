import { Navigate, useParams } from 'react-router-dom'

export function CampaignAdUnitsPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  return <Navigate to={`/campaigns/${campaignId}`} replace />
}
