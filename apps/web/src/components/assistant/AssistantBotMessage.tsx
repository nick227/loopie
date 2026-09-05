// Loopie's one message for the current Action — a short heading, optionally one supporting
// sentence, and (once anything is known) a single compact context line, e.g. "Roofing · Austin ·
// Get more customers". Identity ("Loopie is speaking") is carried by the Action zone's own "NEXT
// ACTION" eyebrow in AssistantPanel.tsx, not repeated per message here — this is just the content.
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
    <div className="space-y-1.5">
      <p className="text-base font-medium leading-snug text-foreground">{heading}</p>
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      {knownFacts && knownFacts.length > 0 ? (
        <p className="pt-0.5 text-xs text-muted-foreground/80" aria-label="Already established">
          {knownFacts.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
