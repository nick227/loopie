import { Navigate, useParams } from 'react-router-dom'

export function UpdateAdPage() {
  const { adId } = useParams<{ adId: string }>()
  return <Navigate to={`/ads/${adId}`} replace />
}
