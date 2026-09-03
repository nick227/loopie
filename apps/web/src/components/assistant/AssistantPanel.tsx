import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNextStep, nextStepQueryKey } from '@project/sdk'
import { AssistantBusinessInfoStep } from './steps/AssistantBusinessInfoStep'
import { AssistantLogoStep } from './steps/AssistantLogoStep'
import { AssistantHomepageCreateStep } from './steps/AssistantHomepageCreateStep'
import { AssistantHomepagePublishStep } from './steps/AssistantHomepagePublishStep'

// V1's locked happy path only (business info -> logo -> homepage -> publish, see CLAUDE.md /
// the Next Steps Assistant plan) — a fixed switch on actionId, deliberately not a generic
// field-driven renderer, so this stays a thin front end for real product actions rather than a
// parallel action DSL. Mounted once in Shell (the one persistent, non-remounting component) so
// it survives navigation between the create-homepage and publish steps.
export function AssistantPanel() {
  const { data, isLoading, isError } = useNextStep()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(true)
  const [dismissedComplete, setDismissedComplete] = useState(false)

  function advance() {
    queryClient.invalidateQueries({ queryKey: nextStepQueryKey })
  }

  if (isLoading || isError || !data) return null

  if (!data.actionId) {
    if (dismissedComplete) return null
    return (
      <div
        data-testid="assistant-panel"
        className="fixed bottom-4 right-4 z-40 w-80 rounded-xl border border-border bg-surface p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            You&apos;re all set — your homepage is live.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissedComplete(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open setup assistant"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles size={20} />
      </button>
    )
  }

  return (
    <div
      data-testid="assistant-panel"
      className="fixed bottom-4 right-4 z-40 w-80 rounded-xl border border-border bg-surface p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {data.progress
              ? `Step ${(data.progress.completed ?? 0) + 1} of ${data.progress.total}`
              : 'Setup'}
          </p>
          <p className="text-sm font-semibold text-foreground">{data.question}</p>
        </div>
        <button
          type="button"
          aria-label="Collapse"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3">
        {data.actionId === 'business_info' ? (
          <AssistantBusinessInfoStep fields={data.fields ?? []} onDone={advance} />
        ) : null}
        {data.actionId === 'business_logo' ? <AssistantLogoStep onDone={advance} /> : null}
        {data.actionId === 'homepage_create' ? (
          <AssistantHomepageCreateStep onDone={advance} />
        ) : null}
        {data.actionId === 'homepage_publish' && data.landingPageId ? (
          <AssistantHomepagePublishStep landingPageId={data.landingPageId} onDone={advance} />
        ) : null}
      </div>
    </div>
  )
}
