import { useParams } from 'react-router-dom'
import { useAsset } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function AssetPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const { data, isLoading } = useAsset(assetId!)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const item = data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Asset</h1>
      <Card>
        <CardContent className="py-4">
          {/* TODO: replace with real fields */}
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(item, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
