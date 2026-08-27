import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type AdRun = components['schemas']['AdRun']

function buyLabel(status: string) {
  if (status === 'ACTIVE') return 'Running'
  if (status === 'PAUSED') return 'Paused'
  if (status === 'PENDING' || status === 'READY') return 'Not started'
  if (status === 'VALIDATION_FAILED' || status === 'PROVISIONING_FAILED') return 'Failed'
  return status
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function DestinationRow({
  id,
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
  id: string
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
  const checked = Boolean(run) || selected
  const daily = run ? Number(run.budget ?? budget) : budget
  const spent = run ? Number(run.spend ?? 0) : 0
  const meta = run
    ? [
        buyLabel(run.status),
        paid ? `${money(daily)}/day` : null,
        spent > 0 ? `${money(spent)} spent` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        checked
          ? 'border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800'
          : 'border-border bg-transparent',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={Boolean(run)}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-zinc-900"
      />
      <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm font-medium">
        {label}
        {hint ? <span className="ml-2 font-normal text-muted-foreground">{hint}</span> : null}
      </label>
      <div className="flex shrink-0 items-center gap-2">
        {meta ? (
          <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{meta}</p>
        ) : paid ? (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>$</span>
            <Input
              type="number"
              min={1}
              value={budget}
              onChange={(event) => onBudget?.(Number(event.target.value))}
              className="h-8 w-16 px-2"
              aria-label={`Budget for ${label}`}
            />
            <span>/day</span>
          </label>
        ) : null}
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
    </div>
  )
}
