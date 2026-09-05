import { useDismissAssistantSignal } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { AssistantBotMessage } from './AssistantBotMessage'

type SignalSummary = {
  headline: string
  detail?: string | null
  actionLabel: string
  actionTarget: string | null
}

// Reactive signals (docs' "Assistant reacts to Loopie activity") — Loopie noticing something,
// not a notification feed entry, so it gets a subtle accent edge rather than an alert/warning
// treatment: a left accent bar + a faint tint, not a bordered box like every other card.
// actionTarget is null for sale_recorded specifically: the cycle has already advanced to Grow
// server-side by the time this card shows, so acting on it just re-fetches into the Grow view
// rather than navigating anywhere.
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

  async function handleNotNow() {
    await dismiss.mutateAsync({ cycleId, signalKey: actionId })
  }

  return (
    <div className="space-y-4 rounded-lg border-l-2 border-l-primary bg-primary/[0.04] py-3.5 pl-4 pr-4">
      <AssistantBotMessage heading={signal.headline} detail={signal.detail} />
      <div className="flex items-center gap-4">
        <Button onClick={handleAction} loading={dismiss.isPending} size="sm">
          {signal.actionLabel}
        </Button>
        <button
          type="button"
          onClick={handleNotNow}
          disabled={dismiss.isPending}
          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
