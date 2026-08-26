import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

type AdUnit = components['schemas']['AdUnit']

const FORMAT_LABEL: Record<AdUnit['format'], string> = {
  DISPLAY_BANNER: 'Display banner',
  NATIVE: 'Native',
  EMBED: 'Embed',
}

const STATUS_LABEL: Record<AdUnit['status'], string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
}

export function AdUnitRow({
  unit,
  creativeName,
  activating,
  onActivate,
}: {
  unit: AdUnit
  creativeName: string
  activating: boolean
  onActivate: (adUnitId: string) => void
}) {
  return (
    <Card>
      <CardContent className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {FORMAT_LABEL[unit.format]} · {creativeName}
          </p>
          <p className="text-xs text-muted-foreground">
            {STATUS_LABEL[unit.status]} · {unit.impressions.toLocaleString()} imps · {unit.clicks.toLocaleString()}{' '}
            clicks
          </p>
          {unit.serveUrl ? <p className="text-[11px] text-muted-foreground break-all">{unit.serveUrl}</p> : null}
        </div>
        {unit.status === 'DRAFT' ? (
          <Button size="sm" variant="outline" disabled={activating} onClick={() => onActivate(unit.id)}>
            Activate
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
