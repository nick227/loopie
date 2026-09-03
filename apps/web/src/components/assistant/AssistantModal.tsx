import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useBusiness, useNextStep, nextStepQueryKey } from '@project/sdk'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { AssistantBusinessInfoStep } from './steps/AssistantBusinessInfoStep'
import { AssistantLogoStep } from './steps/AssistantLogoStep'
import { AssistantHomepageCreateStep } from './steps/AssistantHomepageCreateStep'
import { AssistantHomepagePublishStep } from './steps/AssistantHomepagePublishStep'
import { STEP_COPY, greeting, type AssistantActionId } from './copy'

// V1's locked happy path only (business info -> logo -> homepage -> publish). This modal is a
// presentation/orchestration layer over GET /assistant/next-step and existing operations — it
// never derives completion itself and never persists which screen it's on; reopening always
// resumes wherever the live resolver says is next. See CLAUDE.md "Next Steps Assistant".
type Confirmation = { message: string; terminal?: boolean }

const NON_TERMINAL_CONFIRMATION_MS = 1100

function ConfirmationView({
  message,
  terminal,
  homepageUrl,
  onWhatsNext,
}: {
  message: string
  terminal?: boolean
  homepageUrl?: string | null
  onWhatsNext: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check size={22} />
      </div>
      <p className="text-base font-medium text-foreground">{message}</p>
      {terminal ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {homepageUrl ? (
            <a href={homepageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View homepage</Button>
            </a>
          ) : null}
          <Button onClick={onWhatsNext}>What&apos;s next?</Button>
        </div>
      ) : null}
    </div>
  )
}

function HomeView({
  actionId,
  homepageUrl,
  businessName,
  onOpenFlow,
}: {
  actionId: AssistantActionId | null
  homepageUrl: string | null
  businessName?: string
  onOpenFlow: () => void
}) {
  if (!actionId) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-2 py-8">
        <p className="text-sm text-muted-foreground">{greeting()}.</p>
        <h3 className="text-lg font-semibold text-foreground">
          Nice work — your homepage is live.
        </h3>
        {homepageUrl ? (
          <a href={homepageUrl} target="_blank" rel="noopener noreferrer" className="mt-2">
            <Button variant="outline">View homepage</Button>
          </a>
        ) : null}
      </div>
    )
  }

  const copy = STEP_COPY[actionId]

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()}. What are we working on?</p>
        {businessName ? (
          <h3 className="mt-1 text-lg font-semibold text-foreground">{businessName}</h3>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onOpenFlow}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{copy.cardTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.cardSubtitle}</p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}

function FlowView({
  actionId,
  fields,
  landingPageId,
  confirmation,
  homepageUrl,
  onSuccess,
  onWhatsNext,
}: {
  actionId: AssistantActionId | null
  fields: { name: string; label: string; type: string; required: boolean }[]
  landingPageId: string | null
  confirmation: Confirmation | null
  homepageUrl: string | null
  onSuccess: (message: string, opts?: { terminal?: boolean }) => void
  onWhatsNext: () => void
}) {
  if (confirmation) {
    return (
      <ConfirmationView
        message={confirmation.message}
        terminal={confirmation.terminal}
        homepageUrl={homepageUrl}
        onWhatsNext={onWhatsNext}
      />
    )
  }

  if (!actionId) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Spinner size="sm" />
      </div>
    )
  }

  const copy = STEP_COPY[actionId]

  return (
    <div className="flex-1 space-y-4 py-2">
      <p className="text-base font-medium text-foreground">{copy.flowHeadline}</p>
      {actionId === 'business_info' ? (
        <AssistantBusinessInfoStep
          fields={fields}
          onSuccess={() => onSuccess(STEP_COPY.business_info.successMessage)}
        />
      ) : null}
      {actionId === 'business_logo' ? (
        <AssistantLogoStep onSuccess={() => onSuccess(STEP_COPY.business_logo.successMessage)} />
      ) : null}
      {actionId === 'homepage_create' ? (
        <AssistantHomepageCreateStep
          onSuccess={() => onSuccess(STEP_COPY.homepage_create.successMessage)}
        />
      ) : null}
      {actionId === 'homepage_publish' && landingPageId ? (
        <AssistantHomepagePublishStep
          landingPageId={landingPageId}
          onSuccess={() => onSuccess(STEP_COPY.homepage_publish.successMessage, { terminal: true })}
        />
      ) : null}
    </div>
  )
}

export function AssistantModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError } = useNextStep()
  const business = useBusiness()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'home' | 'flow'>('home')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  function advance() {
    queryClient.invalidateQueries({ queryKey: nextStepQueryKey })
  }

  function handleStepSuccess(message: string, opts?: { terminal?: boolean }) {
    advance()
    setConfirmation({ message, terminal: opts?.terminal })
    if (!opts?.terminal) {
      window.setTimeout(() => setConfirmation(null), NON_TERMINAL_CONFIRMATION_MS)
    }
  }

  function handleWhatsNext() {
    setConfirmation(null)
    setView('home')
  }

  const actionId = (data?.actionId ?? null) as AssistantActionId | null

  return (
    <Modal title="Loopie Assistant" onClose={onClose} size="full">
      <div
        data-testid="assistant-modal"
        className="mx-auto flex h-full w-full max-w-xl flex-1 flex-col px-4 py-2 sm:px-6"
      >
        {view === 'flow' && !confirmation ? (
          <button
            type="button"
            onClick={() => setView('home')}
            className="mb-2 flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Assistant Home
          </button>
        ) : null}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <p className="text-sm text-destructive">
              Something went wrong loading your setup status.
            </p>
          </div>
        ) : view === 'home' ? (
          <HomeView
            actionId={actionId}
            homepageUrl={data?.homepageUrl ?? null}
            businessName={business.data?.data?.name}
            onOpenFlow={() => setView('flow')}
          />
        ) : (
          <FlowView
            actionId={actionId}
            fields={data?.fields ?? []}
            landingPageId={data?.landingPageId ?? null}
            confirmation={confirmation}
            homepageUrl={data?.homepageUrl ?? null}
            onSuccess={handleStepSuccess}
            onWhatsNext={handleWhatsNext}
          />
        )}
      </div>
    </Modal>
  )
}
