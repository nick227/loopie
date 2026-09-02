import { useState } from 'react'
import { useAsset, useLandingPages } from '@project/sdk'
import type { components } from '@project/sdk'
import { Code2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { AdBuyReview } from '@/components/ads/AdBuyReview'
import { AdFeedPreview, AdMediaEmpty, AD_MEDIA_STAGE_HEIGHT } from '@/components/ads/AdMediaStage'
import {
  AdDestinations,
  paidOrderTarget,
  selectedPageTargets,
  type PublishTarget,
} from '@/components/ads/AdDestinations'
import { useFlatPages } from '@/hooks/useFlatPages'
import type { AdOrder } from '@/lib/adOrder'
import { parseOrderSnapshot } from '@/lib/adOrder'
import { pageIdFromKey, paidTargetByKey, runDestinationKey } from '@/lib/adPreview'
import { evaluatePlacementReadiness } from '@/lib/placementCapabilities'
import { EmbedModal } from '@/components/shared/EmbedModal'

type AdRun = components['schemas']['AdRun']

export function AdEditor({
  name,
  primaryText,
  ctaLabel,
  destinationUrl,
  assetIds,
  runs,
  updatedAt,
  pending,
  error,
  onName,
  onPrimaryText,
  onCtaLabel,
  onDestinationUrl,
  onAssetIds,
  onAddAsset,
  onSave,
  saveReady = true,
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
  lastPublishedAt,
  onPostToRiver,
  riverPending,
  onDelete,
  deletePending,
}: {
  name: string
  primaryText: string
  ctaLabel: string
  destinationUrl: string
  assetIds: string[]
  runs: AdRun[]
  updatedAt?: string
  pending: boolean
  error: string | null
  onName: (value: string) => void
  onPrimaryText: (value: string) => void
  onCtaLabel: (value: string) => void
  onDestinationUrl: (value: string) => void
  onAssetIds: (ids: string[]) => void
  onAddAsset: (input: AddMediaInput) => Promise<void>
  onSave: () => Promise<void>
  saveReady?: boolean
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
  lastPublishedAt?: string | null
  onPostToRiver?: () => void
  riverPending?: boolean
  onDelete?: () => void
  deletePending?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [reviewKey, setReviewKey] = useState<string | null>(null)
  const [relaunch, setRelaunch] = useState<{ key: string; run: AdRun } | null>(null)
  const pages = useFlatPages(useLandingPages({ limit: 100 }))
  const onDeckId = assetIds[0]
  const onDeck = useAsset(onDeckId ?? '').data?.data
  const activeReviewKey = relaunch?.key ?? reviewKey
  const reviewTarget = activeReviewKey ? paidTargetByKey(activeReviewKey) : undefined
  const readiness = evaluatePlacementReadiness({
    mediaType: onDeck?.type,
    placements: onDeck?.placements ?? [],
    primaryText,
    ctaLabel,
    destinationUrl,
  })

  async function toggleDestination(key: string, supersedesRunId?: string) {
    if (key.startsWith('page:')) {
      const pageId = pageIdFromKey(key)
      if (!pageId || selected.includes(key)) return
      setSelected((curr) => [...curr, key])
      await onSend(selectedPageTargets([key], supersedesRunId))
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
    <div className="mx-auto w-full space-y-8">
      {/* No `title` — the persistent header (Shell.tsx) already shows this ad's live name via
          usePageTitle (wired in AdPage.tsx/CreateAdPage.tsx). The actual rename control is the
          Input below, unrelated to this header, which is description-only now. */}
      <PageHeader
        variant="editor"
        title="Edit Advertisement"
        primaryAction={
          <Button onClick={() => void onSave()} disabled={pending || !saveReady}>
            Save
          </Button>
        }
        secondaryActions={
          // Same reserved-but-disabled placement as the Page entity's Embed action
          // (LandingPage.tsx) — no embed runtime exists yet for either object
          // (docs/architecture/embeddable-published-objects-v1.md is still an RFC), but the Ad
          // entity's action contract already has this slot so it doesn't need restructuring once
          // the runtime ships.
          <div key="embed-action" className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEmbedModalOpen(true)}
              disabled={!lastPublishedAt}
            >
              <Code2 size={14} /> Embed
            </Button>
            <EmbedModal
              isOpen={embedModalOpen}
              onClose={() => setEmbedModalOpen(false)}
              objectType="ADVERTISEMENT"
              objectId={window.location.pathname.split('/').pop() || 'new'}
            />
          </div>
        }
      />

      <div className="grid gap-8">
        <div className="space-y-5">
          <div className="w-full">
            <label
              htmlFor="ad-name"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Name
            </label>
            <Input
              value={name}
              id="ad-name"
              onChange={(e) => onName(e.target.value)}
              placeholder="Ad name (internal only)"
              required
              className="flex w-full"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="ad-primary-text"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Primary text
            </label>
            <Textarea
              id="ad-primary-text"
              value={primaryText}
              onChange={(e) => onPrimaryText(e.target.value)}
              placeholder="What shows above the media in the Feed post…"
              rows={3}
              voice
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="ad-cta-label"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Call to action
              </label>
              <Input
                id="ad-cta-label"
                value={ctaLabel}
                onChange={(e) => onCtaLabel(e.target.value)}
                placeholder="Learn More"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="ad-destination-url"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Destination URL
              </label>
              <Input
                id="ad-destination-url"
                type="url"
                value={destinationUrl}
                onChange={(e) => onDestinationUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            {onDeckId && onDeck ? (
              <AdFeedPreview
                asset={onDeck}
                primaryText={primaryText}
                ctaLabel={ctaLabel}
                destinationUrl={destinationUrl}
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
              advertisementId={window.location.pathname.split('/').pop() || 'new'}
              onPostToRiver={onPostToRiver}
              riverPending={riverPending}
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
                onReplaceDestination
                  ? (run, pageId) => onReplaceDestination(run.id, pageId)
                  : undefined
              }
              replaceDestinationPendingRunId={replaceDestinationPendingRunId}
              replaceDestinationErrorRunId={replaceDestinationErrorRunId}
              replaceDestinationError={replaceDestinationError}
            />
          ) : null}

          {onDelete ? (
            <div className="border-t border-destructive/30 pt-5">
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                loading={deletePending}
              >
                {!deletePending ? <Trash2 size={14} /> : null} Delete ad
              </Button>
            </div>
          ) : null}
        </div>
      </div>

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
