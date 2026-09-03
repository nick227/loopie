import { useState } from 'react'
import { Bot } from 'lucide-react'
import { useNextStep } from '@project/sdk'
import { AssistantModal } from './AssistantModal'

// The Header's entry point into Loopie Assistant — always visible (unlike the neighboring
// Messages/River icons, which hide below `sm`), since this is meant to become the app's
// recognizable command-center entry point, not a secondary utility.
export function AssistantLauncher() {
  const { data } = useNextStep()
  const [open, setOpen] = useState(false)
  const hasNextAction = !!data?.actionId

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
      {open ? <AssistantModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}
