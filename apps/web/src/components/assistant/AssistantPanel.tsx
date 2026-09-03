import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useBusiness,
  useNextAction,
  nextActionQueryKey,
  useCalendarBoard,
  useScheduleGoalIdea,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { AssistantBusinessInfoStep } from './steps/AssistantBusinessInfoStep'
import { AssistantLogoStep } from './steps/AssistantLogoStep'
import { AssistantHomepageCreateStep } from './steps/AssistantHomepageCreateStep'
import { AssistantPagePublishStep } from './steps/AssistantPagePublishStep'
import { AssistantCampaignCreateStep } from './steps/AssistantCampaignCreateStep'
import { AssistantCampaignResumeStep } from './steps/AssistantCampaignResumeStep'
import {
  STEP_COPY,
  greeting,
  pagePublishCardSubtitle,
  campaignCreateFlowHeadline,
  type AssistantActionId,
} from './copy'

// The assistant is a cross-product operator, not a linear onboarding wizard: it inspects real
// state across Business -> Pages -> Advertising -> (unconditional fallback) Calendar and surfaces
// the single most valuable next action, always resolving to *something* — there's no "done"
// sentinel any more. Every action's actual write goes through the same real operation that
// feature's own UI uses; this panel only decides what to ask and renders the result. See
// GET /assistant/next-action (apps/server/src/services/AssistantService.ts /
// apps/server/src/lib/assistantActions.ts) for the priority chain itself.
type NextAction = NonNullable<ReturnType<typeof useNextAction>['data']>
type Confirmation = { message: string }

const NON_TERMINAL_CONFIRMATION_MS = 1100

function ConfirmationView({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check size={22} />
      </div>
      <p className="text-base font-medium text-foreground">{message}</p>
    </div>
  )
}

// Calendar is the unconditional fallback once Business/Pages/Advertising have nothing left —
// reuses Calendar's own board read as-is (already prioritized/diversified server-side). Renders
// directly on Home (no click-through into a Flow screen) since it's already just one card + one
// button, matching its existing shipped behavior.
function AssistantCalendarCard() {
  const navigate = useNavigate()
  const board = useCalendarBoard()
  const scheduleIdea = useScheduleGoalIdea()
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)

  const idea = board.data?.data?.ideas?.[0] ?? null

  async function handleAdd() {
    if (!idea) return
    await scheduleIdea.mutateAsync({ templateId: idea.templateId, when: 'THIS_WEEK' })
    setConfirmationMessage(STEP_COPY.calendar.successMessage)
    window.setTimeout(() => setConfirmationMessage(null), NON_TERMINAL_CONFIRMATION_MS)
  }

  if (confirmationMessage) return <ConfirmationView message={confirmationMessage} />
  if (board.isLoading) {
    return (
      <div className="py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (!idea) {
    return (
      <p className="text-sm text-muted-foreground">
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
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{idea.title}</p>
      {idea.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{idea.detail}</p> : null}
      <Button onClick={handleAdd} loading={scheduleIdea.isPending} size="sm" className="mt-3">
        {STEP_COPY.calendar.actionLabel}
      </Button>
    </div>
  )
}

function HomeView({
  action,
  homepageUrl,
  businessName,
  onOpenFlow,
}: {
  action: NextAction
  homepageUrl: string | null
  businessName?: string
  onOpenFlow: () => void
}) {
  const actionId = action.actionId as AssistantActionId
  const copy = STEP_COPY[actionId]
  const cardSubtitle =
    actionId === 'page_publish' && action.pageName
      ? pagePublishCardSubtitle(action.pageName)
      : copy.cardSubtitle

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {greeting()}
          {actionId === 'calendar' ? '.' : '. What are we working on?'}
        </p>
        {actionId === 'calendar' ? (
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            Nice work — your homepage is live.
          </h3>
        ) : businessName ? (
          <h3 className="mt-1 text-lg font-semibold text-foreground">{businessName}</h3>
        ) : null}
        {homepageUrl ? (
          <a
            href={homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            View homepage
          </a>
        ) : null}
      </div>
      {actionId === 'calendar' ? (
        <AssistantCalendarCard />
      ) : (
        <button
          type="button"
          onClick={onOpenFlow}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{copy.cardTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{cardSubtitle}</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

function FlowView({
  action,
  confirmation,
  onSuccess,
  onClose,
}: {
  action: NextAction
  confirmation: Confirmation | null
  onSuccess: (message: string) => void
  onClose: () => void
}) {
  if (confirmation) return <ConfirmationView message={confirmation.message} />

  const actionId = action.actionId as AssistantActionId
  const flowHeadline =
    actionId === 'page_publish' && action.pageName
      ? `You have an unpublished page: "${action.pageName}".`
      : actionId === 'campaign_create' && action.pageName
        ? campaignCreateFlowHeadline(action.pageName)
        : STEP_COPY[actionId].flowHeadline

  return (
    <div className="flex-1 space-y-4 py-2">
      <p className="text-base font-medium text-foreground">{flowHeadline}</p>
      {actionId === 'business_info' ? (
        <AssistantBusinessInfoStep
          fields={action.fields ?? []}
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
      {(actionId === 'homepage_publish' || actionId === 'page_publish') && action.landingPageId ? (
        <AssistantPagePublishStep
          landingPageId={action.landingPageId}
          pageName={actionId === 'page_publish' ? (action.pageName ?? undefined) : undefined}
          onSuccess={() =>
            onSuccess(
              actionId === 'page_publish'
                ? STEP_COPY.page_publish.successMessage
                : STEP_COPY.homepage_publish.successMessage,
            )
          }
        />
      ) : null}
      {actionId === 'campaign_create' &&
      action.landingPageId &&
      action.pageName &&
      action.pageUrl ? (
        <AssistantCampaignCreateStep
          pageName={action.pageName}
          pageUrl={action.pageUrl}
          onClose={onClose}
        />
      ) : null}
      {actionId === 'campaign_resume' && action.campaignId ? (
        <AssistantCampaignResumeStep campaignId={action.campaignId} onClose={onClose} />
      ) : null}
    </div>
  )
}

// Non-modal by design: no backdrop, no focus trap, no body-scroll lock — the whole point is that
// the rest of the app stays usable while this is open. Always mounted (see AssistantLauncher) and
// slides via a transform, matching MobileNav.tsx's own persistent-DOM slide pattern, rather than
// mounting/unmounting on every toggle.
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading, isError } = useNextAction()
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

  // Every open starts at Home — predictable re-orientation rather than resuming wherever the
  // user last drilled into (also matters after campaign_create/campaign_resume, which close the
  // panel on navigating away; reopening it should show the fresh next action, not linger on the
  // flow screen for the action that just completed). Adjusted during render (guarded by a
  // previous-value comparison), not in an effect — this is React's own recommended pattern for
  // "reset state when a prop changes" without an extra commit.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setView('home')
      setConfirmation(null)
    }
  }

  // Calendar only ever renders on Home (see AssistantCalendarCard) — once an auto-advance lands
  // on it while the user is still mid-flow, bounce back to Home so it's actually shown. Same
  // during-render adjustment pattern as above.
  if (data?.actionId === 'calendar' && view === 'flow' && !confirmation) {
    setView('home')
  }

  function handleSuccess(message: string) {
    queryClient.invalidateQueries({ queryKey: nextActionQueryKey })
    setConfirmation({ message })
    window.setTimeout(() => setConfirmation(null), NON_TERMINAL_CONFIRMATION_MS)
  }

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

        {isLoading || !data ? (
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
            action={data}
            homepageUrl={data.homepageUrl ?? null}
            businessName={business.data?.data?.name}
            onOpenFlow={() => setView('flow')}
          />
        ) : (
          <FlowView
            action={data}
            confirmation={confirmation}
            onSuccess={handleSuccess}
            onClose={onClose}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
