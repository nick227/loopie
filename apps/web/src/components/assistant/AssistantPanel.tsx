import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useBusiness,
  useNextStep,
  nextStepQueryKey,
  useCalendarBoard,
  useScheduleGoalIdea,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { AssistantBusinessInfoStep } from './steps/AssistantBusinessInfoStep'
import { AssistantLogoStep } from './steps/AssistantLogoStep'
import { AssistantHomepageCreateStep } from './steps/AssistantHomepageCreateStep'
import { AssistantHomepagePublishStep } from './steps/AssistantHomepagePublishStep'
import { STEP_COPY, greeting, type AssistantActionId } from './copy'

// V1's locked happy path (business info -> logo -> homepage -> publish) is a presentation layer
// over GET /assistant/next-step and existing operations — it never derives completion itself and
// never persists which screen it's on; reopening always resumes wherever the live resolver says
// is next. See CLAUDE.md "Next Steps Assistant". Once that path is complete, Home hands off to
// Calendar's own already-built next-best-action system (GoalIdea pool) rather than dead-ending —
// same one-click-act-then-see-what's-next shape, a different (already real, already tested) data
// source, no new engine.
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

// Home's state once the locked V1 path is done. Reuses Calendar's board read as-is (already
// prioritized/diversified server-side) — one idea at a time, one-click "Add to this week"
// (the same schedule mutation Calendar's own UI uses), then the just-scheduled idea naturally
// drops out of the pool and the next one takes its place on refetch.
function AssistantContinueHome({ homepageUrl }: { homepageUrl: string | null }) {
  const navigate = useNavigate()
  const board = useCalendarBoard()
  const scheduleIdea = useScheduleGoalIdea()
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)

  const idea = board.data?.data?.ideas?.[0] ?? null

  async function handleAdd() {
    if (!idea) return
    await scheduleIdea.mutateAsync({ templateId: idea.templateId, when: 'THIS_WEEK' })
    setConfirmationMessage('Added to your calendar')
    window.setTimeout(() => setConfirmationMessage(null), NON_TERMINAL_CONFIRMATION_MS)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()}.</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          Nice work — your homepage is live.
        </h3>
      </div>
      {homepageUrl ? (
        <a href={homepageUrl} target="_blank" rel="noopener noreferrer" className="self-start">
          <Button variant="outline">View homepage</Button>
        </a>
      ) : null}

      <div className="mt-2 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Keep growing
        </p>
        {confirmationMessage ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Check size={16} className="text-primary" />
            {confirmationMessage}
          </div>
        ) : board.isLoading ? (
          <div className="mt-3">
            <Spinner size="sm" />
          </div>
        ) : idea ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-foreground">{idea.title}</p>
            {idea.detail ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{idea.detail}</p>
            ) : null}
            <Button onClick={handleAdd} loading={scheduleIdea.isPending} size="sm" className="mt-3">
              Add to this week
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            You&apos;re all caught up. Check{' '}
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Calendar
            </button>{' '}
            for more ways to grow.
          </p>
        )}
      </div>
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
    return <AssistantContinueHome homepageUrl={homepageUrl} />
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

// Non-modal by design: no backdrop, no focus trap, no body-scroll lock — the whole point is that
// the rest of the app stays usable while this is open. Always mounted (see AssistantLauncher) and
// slides via a transform, matching MobileNav.tsx's own persistent-DOM slide pattern, rather than
// mounting/unmounting on every toggle.
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading, isError } = useNextStep()
  const business = useBusiness()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'home' | 'flow'>('home')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

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

  return createPortal(
    <div
      ref={panelRef}
      data-testid="assistant-modal"
      role="dialog"
      aria-modal="false"
      aria-label="Loopie Assistant"
      aria-hidden={!open}
      tabIndex={-1}
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-background shadow-2xl transition-[transform,visibility] duration-300 ease-out sm:w-[420px]',
        // `visibility` only actually flips to hidden once the slide-out transition finishes
        // (browsers hold the prior value for `hidden`-bound transitions, unlike `visible`-bound
        // ones, which apply immediately) — so closing still slides out instead of vanishing.
        open ? 'visible translate-x-0' : 'invisible translate-x-full',
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Loopie Assistant
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 sm:px-6">
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
    </div>,
    document.body,
  )
}
