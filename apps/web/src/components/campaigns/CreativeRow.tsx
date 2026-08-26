import type { components } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'

type Creative = components['schemas']['Creative']

export function CreativeRow({ creative }: { creative: Creative }) {
  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{creative.name}</p>
          <p className="text-xs text-muted-foreground">
            v{creative.version} · {creative.assetIds.length} {creative.assetIds.length === 1 ? 'asset' : 'assets'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
