import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useNextAction,
  nextActionQueryKey,
  useCalendarBoard,
  useScheduleGoalIdea,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AssistantBusinessInfoStep } from './steps/AssistantBusinessInfoStep'
import { AssistantLogoStep } from './steps/AssistantLogoStep'
import { AssistantHomepageCreateStep } from './steps/AssistantHomepageCreateStep'
import { AssistantPagePublishStep } from './steps/AssistantPagePublishStep'
import { AssistantChoiceStepView } from './steps/AssistantChoiceStepView'
import { AssistantPlanView } from './steps/AssistantPlanView'
import { AssistantGrowView } from './steps/AssistantGrowView'
import { AssistantSignalCard } from './AssistantSignalCard'
import { AssistantBotMessage } from './AssistantBotMessage'
import { AssistantConversationView } from './AssistantConversationView'
import { STEP_COPY, pagePublishCardSubtitle, type AssistantActionId } from './copy'

// Two wholly independent surfaces (2026-09-04): `action` is the single next thing Loopie wants
// the user to do or can do for them (Business -> Page -> Advertising -> the active goal cycle's
// own Learn/Plan/Grow turn, signal-boosted -> Calendar fallback — Learn is the first Action, not
// a separate concept). `conversation` is a browsable advice/knowledge corpus the user can read for
// its own sake — never gated by Action state, so a Learn question and a useful business tip
// render together on Home instead of one hiding the other. `AssistantConversationView` is
// rendered at a stable position on Home (see HomeView) — it must never remount just because the
// Action underneath it changed or briefly showed a confirmation, so exploring the corpus isn't
// interrupted by finishing an unrelated task; only the Action area gets its own per-turn fade
// transition. Every action's actual write goes through the same real operation that feature's own
// UI uses; this panel only decides what to show and renders the result. LEARN/ACT/REVIEW/GROW are
// an internal reasoning model only (see AssistantGoalCycleService) — nothing in this file ever
// shows a phase name, a step count, or a wizard affordance to the user. See GET
// /assistant/next-action (apps/server/src/services/AssistantService.ts) for the resolvers.
type NextActionResponse = NonNullable<ReturnType<typeof useNextAction>['data']>
type SingleAction = NonNullable<NextActionResponse['action']>
type Conversation = NonNullable<NextActionResponse['conversation']>
type Confirmation = { message: string }

const NON_TERMINAL_CONFIRMATION_MS = 1100

function ConfirmationView({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check size={18} />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
      <p className="text-xs text-muted-foreground">Checking your business…</p>
      <div className="w-full max-w-[240px] space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-accent" />
        <div className="h-11 w-full animate-pulse rounded-lg bg-accent" />
      </div>
    </div>
  )
}

// Calendar is the unconditional fallback once Business/Pages/Advertising have nothing left and
// the active goal cycle has nothing to say either — reuses Calendar's own board read as-is
// (already prioritized/diversified server-side).
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
  if (board.isLoading) return <LoadingState />

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
    <div className="space-y-3">
      <AssistantBotMessage heading={idea.title} detail={idea.detail ?? undefined} />
      <Button onClick={handleAdd} loading={scheduleIdea.isPending} size="sm">
        {STEP_COPY.calendar.actionLabel}
      </Button>
    </div>
  )
}

// The Action zone — a compact "NEXT ACTION" eyebrow above whichever existing rendering fits this
// action's shape. None of the per-type components change here, only their framing/position.
function ActionSection({
  action,
  onOpenFlow,
  onNavigate,
  onSuccess,
}: {
  action: SingleAction
  onOpenFlow: () => void
  onNavigate: (path: string) => void
  onSuccess: (message: string) => void
}) {
  const actionId = action.actionId
  const copy = STEP_COPY[actionId as AssistantActionId]
  const cardSubtitle =
    actionId === 'page_publish' && action.pageName
      ? pagePublishCardSubtitle(action.pageName)
      : copy?.cardSubtitle

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Next action
      </p>
      {actionId === 'calendar' ? (
        <AssistantCalendarCard />
      ) : action.type === 'SIGNAL' && action.cycleId && action.signalSummary ? (
        <AssistantSignalCard
          cycleId={action.cycleId}
          actionId={action.actionId}
          signal={action.signalSummary}
          onNavigate={onNavigate}
        />
      ) : actionId === 'learn_step' && action.step ? (
        <AssistantChoiceStepView
          step={action.step}
          knownFacts={action.knownFacts ?? []}
          onLearnComplete={() => onSuccess('Got it.')}
        />
      ) : actionId === 'build_plan' && action.cycleId && action.plan ? (
        <div className="space-y-4">
          <AssistantBotMessage
            heading="I built a plan for this."
            detail={`${action.plan.length} steps to get started.`}
          />
          <AssistantPlanView
            cycleId={action.cycleId}
            plan={action.plan}
            onSuccess={() => onSuccess('Added to your Calendar.')}
          />
        </div>
      ) : actionId === 'grow' && action.cycleId && action.growSummary ? (
        <div className="space-y-4">
          <AssistantBotMessage
            heading={action.growSummary.headline}
            detail={action.growSummary.detail}
          />
          <AssistantGrowView
            cycleId={action.cycleId}
            directions={action.growSummary.directions}
            onSuccess={() => onSuccess('Got it.')}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenFlow}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent active:scale-[0.99]"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{copy?.cardTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{cardSubtitle}</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

function HomeView({
  action,
  conversation,
  confirmation,
  onOpenFlow,
  onNavigate,
  onSuccess,
}: {
  action: SingleAction
  conversation: Conversation | null
  confirmation: Confirmation | null
  onOpenFlow: () => void
  onNavigate: (path: string) => void
  onSuccess: (message: string) => void
}) {
  // Action leads — it's where "a lot of ground to cover" actually gets delivered, one directed
  // step at a time, so it gets the top spot and the full visual weight. Only this area gets a
  // per-turn identity/transition — re-keying it (not the whole Home view) re-triggers the quick
  // fade-in (tailwind.config.ts's `assistant-in` keyframe) on an actual new turn, while
  // AssistantConversationView below stays mounted and untouched by an action changing or a
  // confirmation flashing.
  const actionKey = confirmation
    ? 'confirmation'
    : `${action.type}-${action.actionId}-${action.step?.key ?? ''}`

  return (
    <div className="flex flex-1 flex-col gap-5 py-2">
      <div key={actionKey} className="animate-assistant-in">
        {confirmation ? (
          <ConfirmationView message={confirmation.message} />
        ) : (
          <ActionSection
            action={action}
            onOpenFlow={onOpenFlow}
            onNavigate={onNavigate}
            onSuccess={onSuccess}
          />
        )}
      </div>
      {conversation ? <AssistantConversationView conversation={conversation} /> : null}
    </div>
  )
}

function FlowView({
  action,
  confirmation,
  onSuccess,
}: {
  action: SingleAction
  confirmation: Confirmation | null
  onSuccess: (message: string) => void
}) {
  if (confirmation) return <ConfirmationView message={confirmation.message} />

  const actionId = action.actionId as AssistantActionId
  const flowHeadline =
    actionId === 'page_publish' && action.pageName
      ? `You have an unpublished page: "${action.pageName}".`
      : STEP_COPY[actionId as keyof typeof STEP_COPY]?.flowHeadline

  return (
    <div className="flex-1 space-y-4 py-2">
      {flowHeadline ? (
        <p className="text-base font-medium text-foreground">{flowHeadline}</p>
      ) : null}
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
    </div>
  )
}

// Non-modal by design: no backdrop, no focus trap, no body-scroll lock — the whole point is that
// the rest of the app stays usable while this is open. Always mounted (see AssistantLauncher) and
// slides via a transform, matching MobileNavDrawer's own persistent-DOM slide pattern, rather than
// mounting/unmounting on every toggle. Deliberately narrow (w-96) — an assistant beside the app,
// not a second workspace.
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading, isError } = useNextAction()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
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

  // Every open re-orients to Home if the user had drilled into Flow — predictable, and matters
  // after campaign_create/campaign_resume, which close the panel on navigating away (reopening
  // should show the fresh next action, not linger on the flow screen for the action that just
  // completed). Conversation itself is untouched by this — it isn't unmounted by open/close at
  // all (the panel stays mounted throughout, just visually hidden), so whatever the user was
  // reading is exactly where they left it. Adjusted during render (guarded by a previous-value
  // comparison), not in an effect — React's own recommended pattern for this.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setView('home')
      setConfirmation(null)
    }
  }

  const action = data?.action ?? null

  // Flow only ever renders an action that opens a real form (business_info/page/advertising) — if
  // the action changes shape to something that renders directly on Home (Calendar/a goal-cycle
  // turn/a signal) while the user is still mid-flow, bounce back so it's actually shown. Same
  // during-render adjustment pattern as above.
  if (
    view === 'flow' &&
    !confirmation &&
    (!action ||
      action.type === 'CALENDAR' ||
      action.type === 'GOAL_CYCLE' ||
      action.type === 'SIGNAL')
  ) {
    setView('home')
  }

  function handleSuccess(message: string) {
    queryClient.invalidateQueries({ queryKey: nextActionQueryKey })
    setConfirmation({ message })
    window.setTimeout(() => setConfirmation(null), NON_TERMINAL_CONFIRMATION_MS)
  }

  const flowKey = `flow-${action?.actionId}`

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
        'fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-background shadow-2xl transition-[transform,visibility] duration-300 ease-out sm:w-96',
        // `visibility` only actually flips to hidden once the slide-out transition finishes
        // (browsers hold the prior value for `hidden`-bound transitions, unlike `visible`-bound
        // ones, which apply immediately) — so closing still slides out instead of vanishing.
        open ? 'visible translate-x-0' : 'invisible translate-x-full',
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
        {view === 'flow' && !confirmation ? (
          <button
            type="button"
            onClick={() => setView('home')}
            className="mb-3 flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : null}

        {isLoading || !data || !action ? (
          <LoadingState />
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <p className="text-sm text-destructive">
              Something went wrong loading your setup status.
            </p>
          </div>
        ) : view === 'home' ? (
          <HomeView
            action={action}
            conversation={data.conversation}
            confirmation={confirmation}
            onOpenFlow={() => setView('flow')}
            onNavigate={(path) => {
              onClose()
              navigate(path)
            }}
            onSuccess={handleSuccess}
          />
        ) : (
          <div key={flowKey} className="flex min-h-0 flex-1 flex-col animate-assistant-in">
            <FlowView action={action} confirmation={confirmation} onSuccess={handleSuccess} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
