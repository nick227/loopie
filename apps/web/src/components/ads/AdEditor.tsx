import { useState } from 'react'
import { useAsset, useLandingPages } from '@project/sdk'
import type { components } from '@project/sdk'
import { Code2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { AdBuyReview } from '@/components/ads/AdBuyReview'
import { AdMediaEmpty, AdMediaStage, AD_MEDIA_STAGE_HEIGHT } from '@/components/ads/AdMediaStage'
import {
  AdDestinations,
  paidOrderTarget,
  selectedPageTargets,
  type PublishTarget,
} from '@/components/ads/AdDestinations'
import { useFlatPages } from '@/hooks/useFlatPages'
import { AD_MEDIA_HINT, AD_MEDIA_SENT_HINT, AD_SETUP_INTRO } from '@/lib/adCopy'
import type { AdOrder } from '@/lib/adOrder'
import { loopieRunState, parseOrderSnapshot } from '@/lib/adOrder'
import {
  pageIdFromKey,
  paidTargetByKey,
  runDestinationKey,
  type PreviewFrameId,
} from '@/lib/adPreview'

type AdRun = components['schemas']['AdRun']

export function AdEditor({
  name,
  assetIds,
  runs,
  updatedAt,
  pending,
  error,
  onName,
  onAssetIds,
  onAddAsset,
  onSave,
  onSend,
  onPausePage,
  onSync,
  syncingRunId,
  onPauseRun,
  onResumeRun,
  onEndRun,
  actionPendingRunId,
  onEditBudget,
  editBudgetPendingRunId,
  editBudgetErrorRunId,
  editBudgetError,
  onEditSchedule,
  editSchedulePendingRunId,
  editScheduleErrorRunId,
  editScheduleError,
  onEditTargeting,
  editTargetingPendingRunId,
  editTargetingErrorRunId,
  editTargetingError,
  onReplaceCreative,
  replaceCreativePendingRunId,
  replaceCreativeErrorRunId,
  replaceCreativeError,
  onReplaceDestination,
  replaceDestinationPendingRunId,
  replaceDestinationErrorRunId,
  replaceDestinationError,
}: {
  name: string
  assetIds: string[]
  runs: AdRun[]
  updatedAt?: string
  pending: boolean
  error: string | null
  onName: (value: string) => void
  onAssetIds: (ids: string[]) => void
  onAddAsset: (input: AddMediaInput) => Promise<void>
  onSave: () => Promise<void>
  onSend: (targets: PublishTarget[]) => Promise<void>
  onPausePage?: (runId: string) => void
  onSync?: (runId: string) => void
  syncingRunId?: string
  onPauseRun?: (runId: string) => void
  onResumeRun?: (runId: string) => void
  onEndRun?: (runId: string) => void
  actionPendingRunId?: string
  onEditBudget?: (runId: string, dailyBudget: number) => Promise<void>
  editBudgetPendingRunId?: string
  editBudgetErrorRunId?: string
  editBudgetError?: string | null
  onEditSchedule?: (runId: string, startIso: string, endIso: string | null) => Promise<void>
  editSchedulePendingRunId?: string
  editScheduleErrorRunId?: string
  editScheduleError?: string | null
  onEditTargeting?: (
    runId: string,
    country: string,
    locationNote: string | null,
    radiusMiles: number | null,
  ) => Promise<void>
  editTargetingPendingRunId?: string
  editTargetingErrorRunId?: string
  editTargetingError?: string | null
  onReplaceCreative?: (runId: string) => Promise<void>
  replaceCreativePendingRunId?: string
  replaceCreativeErrorRunId?: string
  replaceCreativeError?: string | null
  onReplaceDestination?: (runId: string, pageId: string) => Promise<void>
  replaceDestinationPendingRunId?: string
  replaceDestinationErrorRunId?: string
  replaceDestinationError?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [frameId, setFrameId] = useState<PreviewFrameId>('desktop')
  const [selected, setSelected] = useState<string[]>([])
  const [reviewKey, setReviewKey] = useState<string | null>(null)
  const [relaunch, setRelaunch] = useState<{ key: string; run: AdRun } | null>(null)
  const pages = useFlatPages(useLandingPages({ limit: 100 }))
  const onDeckId = assetIds[0]
  const onDeck = useAsset(onDeckId ?? '').data?.data
  const activeReviewKey = relaunch?.key ?? reviewKey
  const reviewTarget = activeReviewKey ? paidTargetByKey(activeReviewKey) : undefined
  const sentPaid = runs.some(
    (run) => run.platform !== 'LOOPIE' && loopieRunState(run) === 'draft_sent',
  )

  async function toggleDestination(key: string) {
    if (key.startsWith('page:')) {
      const pageId = pageIdFromKey(key)
      if (!pageId || selected.includes(key)) return
      setSelected((curr) => [...curr, key])
      await onSend(selectedPageTargets([key]))
      setSelected((curr) => curr.filter((k) => k !== key))
    } else {
      setReviewKey(key)
    }
  }

  async function handleSendDraft(order: Partial<AdOrder>) {
    if (!activeReviewKey) return
    const target = paidOrderTarget(activeReviewKey, order as AdOrder, relaunch?.run.id)
    if (!target) return
    await onSave()
    await onSend([target])
    setReviewKey(null)
    setRelaunch(null)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* No `title` — the persistent header (Shell.tsx) already shows this ad's live name via
          usePageTitle (wired in AdPage.tsx/CreateAdPage.tsx). The actual rename control is the
          Input below, unrelated to this header, which is description-only now. */}
      <PageHeader
        variant="editor"
        description={AD_SETUP_INTRO}
        secondaryActions={
          // Same reserved-but-disabled placement as the Page entity's Embed action
          // (LandingPage.tsx) — no embed runtime exists yet for either object
          // (docs/architecture/embeddable-published-objects-v1.md is still an RFC), but the Ad
          // entity's action contract already has this slot so it doesn't need restructuring once
          // the runtime ships.
          <Button variant="outline" disabled title="Embed is coming soon">
            <Code2 size={14} /> Embed
          </Button>
        }
      />
      <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Ad name" required />

      <div className="space-y-2">
        <p className="text-center text-sm font-medium">Media</p>
        <p className="text-center text-sm text-muted-foreground">
          {sentPaid ? AD_MEDIA_SENT_HINT : AD_MEDIA_HINT}
        </p>
        {onDeckId && onDeck ? (
          <AdMediaStage
            asset={onDeck}
            frameId={frameId}
            onFrame={setFrameId}
            onRemove={() => onAssetIds([])}
          />
        ) : onDeckId ? (
          <Skeleton className={`${AD_MEDIA_STAGE_HEIGHT} w-full rounded-xl`} />
        ) : (
          <AdMediaEmpty onChoose={() => setOpen(true)} />
        )}
      </div>

      {onDeckId || runs.length > 0 ? (
        <AdDestinations
          mediaType={onDeck && onDeck.type !== 'AUDIO' ? onDeck.type : undefined}
          pages={pages}
          runs={runs}
          selected={selected}
          advertisementUpdatedAt={updatedAt}
          onToggle={(key) => toggleDestination(key)}
          onPausePage={onPausePage}
          onRelaunch={(run) => setRelaunch({ key: runDestinationKey(run), run })}
          onSync={onSync ? (run) => onSync(run.id) : undefined}
          syncingRunId={syncingRunId}
          onPauseRun={onPauseRun ? (run) => onPauseRun(run.id) : undefined}
          onResumeRun={onResumeRun ? (run) => onResumeRun(run.id) : undefined}
          onEndRun={onEndRun ? (run) => onEndRun(run.id) : undefined}
          actionPendingRunId={actionPendingRunId}
          onEditBudget={
            onEditBudget ? (run, dailyBudget) => onEditBudget(run.id, dailyBudget) : undefined
          }
          editBudgetPendingRunId={editBudgetPendingRunId}
          editBudgetErrorRunId={editBudgetErrorRunId}
          editBudgetError={editBudgetError}
          onEditSchedule={
            onEditSchedule
              ? (run, startIso, endIso) => onEditSchedule(run.id, startIso, endIso)
              : undefined
          }
          editSchedulePendingRunId={editSchedulePendingRunId}
          editScheduleErrorRunId={editScheduleErrorRunId}
          editScheduleError={editScheduleError}
          onEditTargeting={
            onEditTargeting
              ? (run, country, locationNote, radiusMiles) =>
                  onEditTargeting(run.id, country, locationNote, radiusMiles)
              : undefined
          }
          editTargetingPendingRunId={editTargetingPendingRunId}
          editTargetingErrorRunId={editTargetingErrorRunId}
          editTargetingError={editTargetingError}
          onReplaceCreative={onReplaceCreative ? (run) => onReplaceCreative(run.id) : undefined}
          replaceCreativePendingRunId={replaceCreativePendingRunId}
          replaceCreativeErrorRunId={replaceCreativeErrorRunId}
          replaceCreativeError={replaceCreativeError}
          onReplaceDestination={
            onReplaceDestination ? (run, pageId) => onReplaceDestination(run.id, pageId) : undefined
          }
          replaceDestinationPendingRunId={replaceDestinationPendingRunId}
          replaceDestinationErrorRunId={replaceDestinationErrorRunId}
          replaceDestinationError={replaceDestinationError}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {reviewTarget ? (
        <AdBuyReview
          target={reviewTarget}
          pending={pending}
          error={error}
          initialOrder={
            relaunch ? (parseOrderSnapshot(relaunch.run.orderSnapshot) ?? undefined) : undefined
          }
          onBack={() => {
            setReviewKey(null)
            setRelaunch(null)
          }}
          onSend={(order) => void handleSendDraft(order)}
        />
      ) : null}

      {open ? (
        <MediaPicker
          selectedIds={assetIds}
          adding={pending}
          single
          onToggle={(id) => onAssetIds(assetIds[0] === id ? [] : [id])}
          onAdd={onAddAsset}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
