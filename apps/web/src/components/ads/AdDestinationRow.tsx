import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type AdRun = components['schemas']['AdRun']

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'On'
  if (status === 'PAUSED' || status === 'PENDING' || status === 'READY') return 'Off'
  if (status === 'VALIDATION_FAILED' || status === 'PROVISIONING_FAILED') return 'Failed'
  return status
}

export function DestinationRow({
  label,
  hint,
  run,
  selected,
  budget,
  paid,
  onToggle,
  onBudget,
  onStart,
  onPause,
}: {
  label: string
  hint?: string
  run?: AdRun
  selected: boolean
  budget: number
  paid: boolean
  onToggle: () => void
  onBudget?: (value: number) => void
  onStart?: () => void
  onPause?: () => void
}) {
  const on = run ? run.status === 'ACTIVE' : selected
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5',
        on ? 'border-zinc-900 dark:border-zinc-100' : 'border-border',
      )}
    >
      {run ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {statusLabel(run.status)}
        </span>
      ) : null}
      {run ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : (
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </button>
      )}
      {paid ? (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          $
          <Input
            type="number"
            min={1}
            value={run ? Number(run.budget ?? budget) : budget}
            onChange={(event) => onBudget?.(Number(event.target.value))}
            className="h-8 w-20"
            disabled={Boolean(run)}
          />
        </label>
      ) : (
        <span className="text-xs text-muted-foreground">$0</span>
      )}
      {onPause ? (
        <Button type="button" size="sm" variant="outline" onClick={onPause}>
          Pause
        </Button>
      ) : null}
      {onStart ? (
        <Button type="button" size="sm" onClick={onStart}>
          Start
        </Button>
      ) : null}
    </div>
  )
}
