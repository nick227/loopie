import { Navigate, useParams } from 'react-router-dom'

export function AssetToMedia() {
  const { assetId } = useParams<{ assetId: string }>()
  return <Navigate to={`/media/${assetId}`} replace />
}
