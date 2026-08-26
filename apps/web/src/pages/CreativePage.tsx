import { Link, useParams } from 'react-router-dom'
import { useCreative } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

export function CreativePage() {
  const { creativeId } = useParams<{ creativeId: string }>()
  const { data, isLoading } = useCreative(creativeId!)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const item = data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="text-xs text-muted-foreground">Version {item.version}</p>
        </div>
        <Link to={`/creatives/${creativeId}/edit`}>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="py-4 space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Assets · </span>
            {item.assetIds.length}
          </p>
          {item.hostedUrl ? (
            <a href={item.hostedUrl} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
              {item.hostedUrl}
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
