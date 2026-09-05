import { useState } from 'react'
import { useAsset, useLandingPages } from '@project/sdk'
import type { components } from '@project/sdk'
import { Code2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/ui/PageHeader'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { AddMediaInput } from '@/components/media/AddMediaForm'
import { AdBuyReview } from '@/components/ads/AdBuyReview'
import { AdMediaThumb } from '@/components/ads/AdMediaThumb'
import { AdStudioShell } from '@/components/ads/AdStudioShell'
import { AdPreview } from '@/components/ads/preview/AdPreview'
import type { AdPreviewPlacement } from '@/components/ads/preview/types'
import {
  AdDestinations,
  RIVER_DESTINATION_KEY,
  paidOrderTarget,
  selectedPageTargets,
  type PublishTarget,
} from '@/components/ads/AdDestinations'
import { useFlatPages } from '@/hooks/useFlatPages'
import type { AdOrder } from '@/lib/adOrder'
import { parseOrderSnapshot } from '@/lib/adOrder'
import { paidTargetByKey, runDestinationKey } from '@/lib/adPreview'
import { EmbedModal } from '@/components/shared/EmbedModal'

type AdRun = components['schemas']['AdRun']

export function AdEditor({
  name,
  primaryText,
  headline,
  ctaLabel,
  destinationUrl,
  assetIds,
  runs,
  updatedAt,
  pending,
  dirty,
  error,
  onName,
  onPrimaryText,
  onHeadline,
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
  onPostToRiver,
  riverPending,
  onDelete,
  deletePending,
  initialMediaPickerType,
  autoFocusPrimaryText,
}: {
  name: string
  primaryText: string
  headline: string
  ctaLabel: string
  destinationUrl: string
  assetIds: string[]
  runs: AdRun[]
  updatedAt?: string
  pending: boolean
  dirty?: boolean
  error: string | null
  onName: (value: string) => void
  onPrimaryText: (value: string) => void
  onHeadline: (value: string) => void
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
  initialMediaPickerType?: 'IMAGE' | 'VIDEO'
  autoFocusPrimaryText?: boolean
}) {
  const [open, setOpen] = useState(Boolean(initialMediaPickerType))
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [reviewKey, setReviewKey] = useState<string | null>(null)
  const [relaunch, setRelaunch] = useState<{ key: string; run: AdRun } | null>(null)
  const [placement, setPlacement] = useState<AdPreviewPlacement>('meta-feed')
  const pages = useFlatPages(useLandingPages({ limit: 100 }))
  const onDeckId = assetIds[0]
  const onDeck = useAsset(onDeckId ?? '').data?.data
  const activeReviewKey = relaunch?.key ?? reviewKey
  const reviewTarget = activeReviewKey ? paidTargetByKey(activeReviewKey) : undefined

  async function handlePublishSelected() {
    const paidKey = selected.find((key) => Boolean(paidTargetByKey(key)))
    if (paidKey) {
      setReviewKey(paidKey)
      return
    }

    const wantsRiver = selected.includes(RIVER_DESTINATION_KEY)
    const pageKeys = selected.filter((key) => key.startsWith('page:'))
    if (wantsRiver) await onPostToRiver?.()
    if (pageKeys.length > 0) await onSend(selectedPageTargets(pageKeys))
    setSelected([])
  }

  async function handleRepublishPage(key: string, supersedesRunId: string) {
    await onSend(selectedPageTargets([key], supersedesRunId))
  }

  async function handleSendDraft(order: Partial<AdOrder>) {
    if (!activeReviewKey) return
    const target = paidOrderTarget(activeReviewKey, order as AdOrder, relaunch?.run.id)
    if (!target) return
    await onSave()
    await onSend([target])
    setSelected((curr) => curr.filter((k) => k !== activeReviewKey))
    setReviewKey(null)
    setRelaunch(null)
  }

  const saveHint = pending && dirty ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved.'

  const contentFields = (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Ad Content</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Core content used across all placements.
        </p>
      </div>

      <div className="space-y-1">
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
          placeholder="What shows above the media…"
          rows={3}
          voice
          autoFocus={autoFocusPrimaryText}
        />
        <p className="text-right text-[11px] tabular-nums text-muted-foreground">
          {primaryText.length}/500
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ad-headline"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Headline
        </label>
        <Input
          id="ad-headline"
          value={headline}
          onChange={(e) => onHeadline(e.target.value)}
          placeholder="Short headline under the media"
        />
      </div>

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

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Media</p>
        <AdMediaThumb
          asset={onDeckId ? onDeck : null}
          loading={Boolean(onDeckId && !onDeck)}
          onChoose={() => setOpen(true)}
          onRemove={() => onAssetIds([])}
        />
      </div>
    </div>
  )

  const distribution =
    onDeckId || runs.length > 0 ? (
      <AdDestinations
        mediaType={onDeck && onDeck.type !== 'AUDIO' ? onDeck.type : undefined}
        pages={pages}
        runs={runs}
        selected={selected}
        onSelectedChange={setSelected}
        onPublishSelected={() => void handlePublishSelected()}
        publishPending={pending || riverPending}
        advertisementUpdatedAt={updatedAt}
        advertisementId={window.location.pathname.split('/').pop() || 'new'}
        onPostToRiver={onPostToRiver}
        onRepublishPage={(key, supersedesRunId) => void handleRepublishPage(key, supersedesRunId)}
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
    ) : null

  return (
    <div className="mx-auto w-full space-y-6">
      <PageHeader
        variant="editor"
        title="Edit Advertisement"
        description={
          <>
            Create a reusable advertisement
            {dirty !== undefined ? <span className="mt-1 block text-xs">{saveHint}</span> : null}
          </>
        }
        primaryAction={
          <Button onClick={() => void onSave()} disabled={pending || !saveReady}>
            Save
          </Button>
        }
        secondaryActions={
          <div key="embed-action" className="flex items-center gap-2">
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                loading={deletePending}
              >
                {!deletePending ? <Trash2 size={14} /> : null} Delete ad
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                void (async () => {
                  await onSave()
                  setEmbedModalOpen(true)
                })()
              }}
              disabled={pending}
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

      <AdStudioShell
        left={contentFields}
        right={
          <AdPreview
            advertisement={{
              name,
              primaryText,
              headline,
              ctaLabel,
              destinationUrl,
              asset: onDeck ?? null,
            }}
            placement={placement}
            onPlacementChange={setPlacement}
          />
        }
        below={
          <>
            {distribution}
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </>
        }
      />

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
          type={initialMediaPickerType}
          onToggle={(id) => onAssetIds(assetIds[0] === id ? [] : [id])}
          onAdd={onAddAsset}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
