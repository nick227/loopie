import { useState } from 'react'
import { Bot } from 'lucide-react'
import { useNextAction } from '@project/sdk'
import { AssistantPanel } from './AssistantPanel'

// The Header's entry point into Loopie Assistant — always visible (unlike the neighboring
// Messages/River icons, which hide below `sm`), since this is meant to become the app's
// recognizable command-center entry point, not a secondary utility. AssistantPanel is always
// mounted (not conditionally rendered) so its own slide transition can run both ways — see its
// own comment.
export function AssistantLauncher() {
  const { data } = useNextAction()
  const [open, setOpen] = useState(false)
  // The resolver always resolves to *something* now (Calendar is an unconditional fallback), so
  // the dot means "a genuine product gap is waiting," not "the assistant has an opinion" — it
  // would be on permanently otherwise, which is exactly the "aggressive badge" this is meant to
  // avoid.
  const hasNextAction = !!data?.actionId && data.actionId !== 'calendar'

  return (
    <>
      <button
        type="button"
        aria-label={hasNextAction ? 'Loopie Assistant, a next step is ready' : 'Loopie Assistant'}
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bot size={18} />
        {hasNextAction ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
          />
        ) : null}
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
