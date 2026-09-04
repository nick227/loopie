import { ChevronRight } from 'lucide-react'
import { useAnswerAssistantLearnQuestion } from '@project/sdk'
import { AssistantBotMessage } from '../AssistantBotMessage'

type Step = {
  key: string
  heading: string
  description?: string | null
  choices: { value: string; label: string }[]
  writesKnowledge: string
}

// The Learn phase's one generic renderer (docs/loopie-assistant-playbook-poc/03-poc-
// implementation-plan.md section 13) — heading + 3-7 buttons, content computed server-side
// (venture taxonomy node / selected playbook), so there is nothing to look up client-side by
// actionId here unlike the static per-action copy the rest of this panel uses. Answering
// immediately re-fetches the next question via the mutation's own query invalidation — no local
// "which step am I on" state to track, and question-to-question transitions are deliberately
// instant/quiet (the growing knownFacts trail is the only progress signal). `onLearnComplete`
// fires only when an answer resolves Learn entirely (the response is no longer a learn_step) —
// that's the one transition worth a distinct payoff beat, not every single answer.
export function AssistantChoiceStepView({
  step,
  knownFacts,
  onLearnComplete,
}: {
  step: Step
  knownFacts: string[]
  onLearnComplete: () => void
}) {
  const answer = useAnswerAssistantLearnQuestion()

  function handleChoose(value: string) {
    answer.mutate(
      { questionKey: step.writesKnowledge, value },
      { onSuccess: (data) => data && data.actionId !== 'learn_step' && onLearnComplete() },
    )
  }

  return (
    <div className="space-y-4">
      <AssistantBotMessage
        knownFacts={knownFacts}
        heading={step.heading}
        detail={step.description}
      />
      <div className="grid gap-2">
        {step.choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            disabled={answer.isPending}
            onClick={() => handleChoose(choice.value)}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-accent disabled:opacity-50"
          >
            {choice.label}
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
