import { Navigate, useParams } from 'react-router-dom'

export function CreativeToAd() {
  const { creativeId } = useParams<{ creativeId: string }>()
  return <Navigate to={`/ads/${creativeId}`} replace />
}

export function CreativeEditToAd() {
  const { creativeId } = useParams<{ creativeId: string }>()
  return <Navigate to={`/ads/${creativeId}`} replace />
}
