import { useDismissAssistantSignal } from '@project/sdk'
import { Button } from '@/components/ui/Button'

type SignalSummary = {
  headline: string
  detail?: string | null
  actionLabel: string
  actionTarget: string | null
}

// Reactive signals (docs' "Assistant reacts to Loopie activity") — renders directly on Home, like
// AssistantCalendarCard, since it's already just one card + one button. actionTarget is null for
// sale_recorded specifically: the cycle has already advanced to Grow server-side by the time this
// card shows, so dismissing just re-fetches into the Grow view rather than navigating anywhere.
export function AssistantSignalCard({
  cycleId,
  actionId,
  signal,
  onNavigate,
}: {
  cycleId: string
  actionId: string
  signal: SignalSummary
  onNavigate: (path: string) => void
}) {
  const dismiss = useDismissAssistantSignal()

  async function handleAction() {
    await dismiss.mutateAsync({ cycleId, signalKey: actionId })
    if (signal.actionTarget) onNavigate(signal.actionTarget)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{signal.headline}</p>
      {signal.detail ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{signal.detail}</p>
      ) : null}
      <Button onClick={handleAction} loading={dismiss.isPending} size="sm" className="mt-3">
        {signal.actionLabel}
      </Button>
    </div>
  )
}
