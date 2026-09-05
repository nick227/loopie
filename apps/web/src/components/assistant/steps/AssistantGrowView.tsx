import { useGrowAssistantGoalCycle } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Direction = {
  value: 'DO_MORE' | 'IMPROVE' | 'NEW_CHANNEL' | 'INCREASE_GOAL' | 'NEW_GOAL'
  label: string
}

// Grow's concrete next-direction choices — selecting one completes the current goal cycle and
// starts the next Act cycle (or, for NEW_GOAL, routes back through Learn) without re-asking any
// already-known business fact. See AssistantGoalCycleService.grow. Directions arrive in
// recommendation order (growDirectionsFor) — the first gets real visual weight (filled, matching
// this panel's primary Button) rather than reading as just one more item in a uniform list.
export function AssistantGrowView({
  cycleId,
  directions,
  onSuccess,
}: {
  cycleId: string
  directions: Direction[]
  onSuccess: () => void
}) {
  const grow = useGrowAssistantGoalCycle()

  async function handleChoose(direction: Direction['value']) {
    await grow.mutateAsync({ cycleId, direction })
    onSuccess()
  }

  return (
    <div className="flex flex-col gap-2">
      {directions.map((direction, i) =>
        i === 0 ? (
          <Button
            key={direction.value}
            size="lg"
            onClick={() => handleChoose(direction.value)}
            loading={grow.isPending}
            className="h-auto justify-start rounded-lg py-3.5"
          >
            {direction.label}
          </Button>
        ) : (
          <button
            key={direction.value}
            type="button"
            disabled={grow.isPending}
            onClick={() => handleChoose(direction.value)}
            className={cn(
              'rounded-lg border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent active:scale-[0.99] disabled:opacity-50',
            )}
          >
            {direction.label}
          </button>
        ),
      )}
    </div>
  )
}
