import { Bot } from 'lucide-react'

// Loopie's one message for the current state — heading only, optionally one short detail
// sentence, and (Learn only) a quiet breadcrumb of what's already established. This is the whole
// "bot speaks" identity: no transcript, no chat bubbles, no message history — the content is
// simply replaced wholesale on every state change (see AssistantPanel.tsx). The small icon badge
// is what carries the "someone/something is talking to you" feeling without pretending this is a
// live conversation.
export function AssistantBotMessage({
  knownFacts,
  heading,
  detail,
}: {
  knownFacts?: string[]
  heading: string
  detail?: string | null
}) {
  return (
    <div className="space-y-2.5">
      {knownFacts && knownFacts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Already established">
          {knownFacts.map((fact, i) => (
            <span
              key={i}
              className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {fact}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot size={15} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-semibold leading-snug text-foreground">{heading}</p>
          {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </div>
    </div>
  )
}
