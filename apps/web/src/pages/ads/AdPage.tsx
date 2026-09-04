import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { components } from '@project/sdk'
import {
  ApiError,
  useAdRuns,
  useAdvertisement,
  useCreateAdRun,
  useCreateAsset,
  useEndAdRun,
  usePauseAdRun,
  useReplaceAdRunCreative,
  useReplaceAdRunDestination,
  useResumeAdRun,
  useSyncAdRun,
  useUpdateAdRunBudget,
  useUpdateAdRunSchedule,
  useUpdateAdRunTargeting,
  useUpdateAdvertisement,
  usePublishAdvertisement,
  useCreateRiverPost,
  useDeleteAdvertisement,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdEditor } from '@/components/ads/AdEditor'
import { EditAdDesignerPage } from '@/pages/ads/EditAdDesignerPage'
import { startAdRuns } from '@/lib/startAdRuns'
import { usePageTitle } from '@/lib/headerContext'

export function AdPage() {
  const { adId } = useParams<{ adId: string }>()
  const adQuery = useAdvertisement(adId ?? '')
  const runsQuery = useAdRuns(adId ?? '')

  if (adQuery.isLoading) return <Skeleton className="mx-auto h-48 w-full max-w-2xl" />
  const ad = adQuery.data?.data
  if (!ad) return <p className="text-center text-muted-foreground">Ad not found.</p>

  // Ad Designer (2026-09-03) — a saved Poster/Story/Feed Post reopens in its own designer, "with
  // the same appearance," instead of the generic AdEditor/AdRun-management flow below (which
  // still fully applies to every pre-existing generic ad — format stays null for those).
  if (ad.format) return <EditAdDesignerPage ad={ad} />

  return (
    <AdPageEditor
      id={ad.id}
      name={ad.name}
      primaryText={ad.primaryText ?? ''}
      ctaLabel={ad.ctaLabel ?? ''}
      destinationUrl={ad.destinationUrl ?? ''}
      assetIds={ad.assetIds}
      updatedAt={ad.updatedAt}
      lastPublishedAt={ad.lastPublishedAt ?? null}
      runs={runsQuery.data?.data ?? []}
    />
  )
}

function AdPageEditor({
  id,
  name: initialName,
  primaryText: initialPrimaryText,
  ctaLabel: initialCtaLabel,
  destinationUrl: initialDestinationUrl,
  assetIds: initialIds,
  updatedAt,
  lastPublishedAt,
  runs,
}: {
  id: string
  name: string
  primaryText: string
  ctaLabel: string
  destinationUrl: string
  assetIds: string[]
  updatedAt: string
  lastPublishedAt: string | null
  runs: components['schemas']['AdRun'][]
}) {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()
  const updateAd = useUpdateAdvertisement()
  const publishAd = usePublishAdvertisement()
  const createRiverPost = useCreateRiverPost()
  const deleteAd = useDeleteAdvertisement()
  const createRun = useCreateAdRun()
  const pauseRun = usePauseAdRun()
  const resumeRun = useResumeAdRun()
  const endRun = useEndAdRun()
  const syncRun = useSyncAdRun()
  const editBudget = useUpdateAdRunBudget()
  const editSchedule = useUpdateAdRunSchedule()
  const editTargeting = useUpdateAdRunTargeting()
  const replaceCreative = useReplaceAdRunCreative()
  const replaceDestination = useReplaceAdRunDestination()
  const [name, setName] = useState(initialName)
  usePageTitle(name || 'Ad')
  const [primaryText, setPrimaryText] = useState(initialPrimaryText)
  const [ctaLabel, setCtaLabel] = useState(initialCtaLabel)
  const [destinationUrl, setDestinationUrl] = useState(initialDestinationUrl)
  const [assetIds, setAssetIds] = useState(initialIds)
  const [error, setError] = useState<string | null>(null)
  // Kept separate from the generic `error` banner above — they render inside their own modals
  // (see BudgetEditor/ScheduleEditor's confirm steps), right where the commitment was being made.
  const [budgetError, setBudgetError] = useState<{ runId: string; message: string } | null>(null)
  const [scheduleError, setScheduleError] = useState<{ runId: string; message: string } | null>(
    null,
  )
  const [targetingError, setTargetingError] = useState<{ runId: string; message: string } | null>(
    null,
  )
  const [replaceCreativeError, setReplaceCreativeError] = useState<{
    runId: string
    message: string
  } | null>(null)
  const [replaceDestinationError, setReplaceDestinationError] = useState<{
    runId: string
    message: string
  } | null>(null)
  const pending =
    updateAd.isPending ||
    createAsset.isPending ||
    createRun.isPending ||
    pauseRun.isPending ||
    resumeRun.isPending ||
    endRun.isPending ||
    editBudget.isPending ||
    editSchedule.isPending ||
    editTargeting.isPending ||
    replaceCreative.isPending ||
    replaceDestination.isPending ||
    publishAd.isPending ||
    createRiverPost.isPending ||
    deleteAd.isPending

  const actionPendingRunId =
    (pauseRun.isPending && pauseRun.variables?.runId) ||
    (resumeRun.isPending && resumeRun.variables?.runId) ||
    (endRun.isPending && endRun.variables?.runId) ||
    undefined

  const [dirty, setDirty] = useState(false)
  const generation = useRef(0)

  const persist = useCallback(async () => {
    if (!dirty) return
    await updateAd.mutateAsync({ id, name, primaryText, ctaLabel, destinationUrl, assetIds })
    setDirty(false)
  }, [dirty, id, name, primaryText, ctaLabel, destinationUrl, assetIds, updateAd])

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => {
      persist().catch(() => {})
    }, 800)
    return () => window.clearTimeout(timer)
  }, [dirty, name, primaryText, ctaLabel, destinationUrl, assetIds, persist])

  function markDirty(_dirty?: boolean) {
    generation.current += 1
    setDirty(true)
  }

  async function handlePostToRiver() {
    setError(null)
    try {
      await persist()
      // Each River post pins an immutable published version. Publishing immediately before the
      // post guarantees the River card gets the editor's current creative and exact CTA.
      await publishAd.mutateAsync({ id })
      await createRiverPost.mutateAsync({ type: 'AD', advertisementId: id })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not post to River',
      )
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteAd.mutateAsync(id)
      navigate('/ads')
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not delete ad',
      )
    }
  }

  async function runAction(
    mutateAsync: (input: { advertisementId: string; runId: string }) => Promise<unknown>,
    runId: string,
    verb: string,
  ) {
    setError(null)
    try {
      await mutateAsync({ advertisementId: id, runId })
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : `Could not ${verb}`)
    }
  }

  async function handleEditBudget(runId: string, dailyBudget: number) {
    setBudgetError(null)
    try {
      await editBudget.mutateAsync({ advertisementId: id, runId, dailyBudget })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not update budget'
      setBudgetError({ runId, message })
      throw err // rethrow so the budget modal knows to stay open and show the error
    }
  }

  async function handleEditSchedule(runId: string, startIso: string, endIso: string | null) {
    setScheduleError(null)
    try {
      await editSchedule.mutateAsync({
        advertisementId: id,
        runId,
        startDate: startIso,
        endDate: endIso,
      })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not update schedule'
      setScheduleError({ runId, message })
      throw err // rethrow so the schedule modal knows to stay open and show the error
    }
  }

  async function handleEditTargeting(
    runId: string,
    country: string,
    locationNote: string | null,
    radiusMiles: number | null,
  ) {
    setTargetingError(null)
    try {
      await editTargeting.mutateAsync({
        advertisementId: id,
        runId,
        country,
        locationNote,
        radiusMiles,
      })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not update targeting'
      setTargetingError({ runId, message })
      throw err // rethrow so the targeting modal knows to stay open and show the error
    }
  }

  async function handleReplaceCreative(runId: string) {
    setReplaceCreativeError(null)
    try {
      await replaceCreative.mutateAsync({
        advertisementId: id,
        runId,
        idempotencyKey: crypto.randomUUID(),
      })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not replace creative'
      setReplaceCreativeError({ runId, message })
      throw err
    }
  }

  async function handleReplaceDestination(runId: string, pageId: string) {
    setReplaceDestinationError(null)
    try {
      await replaceDestination.mutateAsync({
        advertisementId: id,
        runId,
        destinationLandingPageId: pageId,
        idempotencyKey: crypto.randomUUID(),
      })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not replace destination'
      setReplaceDestinationError({ runId, message })
      throw err // rethrow so the destination modal knows to stay open and show the error
    }
  }

  return (
    <AdEditor
      name={name}
      primaryText={primaryText}
      ctaLabel={ctaLabel}
      destinationUrl={destinationUrl}
      assetIds={assetIds}
      runs={runs}
      updatedAt={updatedAt}
      pending={pending}
      error={error}
      lastPublishedAt={lastPublishedAt}
      onPostToRiver={() => void handlePostToRiver()}
      riverPending={publishAd.isPending || createRiverPost.isPending}
      onDelete={() => void handleDelete()}
      deletePending={deleteAd.isPending}
      onName={(val) => {
        setName(val)
        markDirty()
      }}
      onPrimaryText={(val) => {
        setPrimaryText(val)
        markDirty()
      }}
      onCtaLabel={(val) => {
        setCtaLabel(val)
        markDirty()
      }}
      onDestinationUrl={(val) => {
        setDestinationUrl(val)
        markDirty()
      }}
      onAssetIds={(val) => {
        setAssetIds(val)
        markDirty()
      }}
      onAddAsset={async (input) => {
        const result = await createAsset.mutateAsync(input)
        const nextId = result.data?.id
        if (nextId) setAssetIds([nextId])
      }}
      saveReady={
        name.trim().length > 0 &&
        (name !== initialName ||
          primaryText !== initialPrimaryText ||
          ctaLabel !== initialCtaLabel ||
          destinationUrl !== initialDestinationUrl ||
          assetIds.length !== initialIds.length ||
          assetIds.some((id, i) => id !== initialIds[i]))
      }
      onSave={async () => {
        setError(null)
        try {
          await updateAd.mutateAsync({ id, name, primaryText, ctaLabel, destinationUrl, assetIds })
          setDirty(false)
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
          )
        }
      }}
      onSend={async (targets) => {
        setError(null)
        try {
          await updateAd.mutateAsync({ id, name, primaryText, ctaLabel, destinationUrl, assetIds })
          await startAdRuns(id, targets, createRun.mutateAsync, resumeRun.mutateAsync)
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not send ad',
          )
        }
      }}
      onPausePage={(runId) => void runAction(pauseRun.mutateAsync, runId, 'pause')}
      onSync={(runId) => syncRun.mutate({ advertisementId: id, runId })}
      syncingRunId={syncRun.isPending ? syncRun.variables?.runId : undefined}
      onPauseRun={(runId) => void runAction(pauseRun.mutateAsync, runId, 'pause')}
      onResumeRun={(runId) => void runAction(resumeRun.mutateAsync, runId, 'resume')}
      onEndRun={(runId) => void runAction(endRun.mutateAsync, runId, 'end')}
      actionPendingRunId={actionPendingRunId || undefined}
      onEditBudget={handleEditBudget}
      editBudgetPendingRunId={editBudget.isPending ? editBudget.variables?.runId : undefined}
      editBudgetErrorRunId={budgetError?.runId}
      editBudgetError={budgetError?.message}
      onEditSchedule={handleEditSchedule}
      editSchedulePendingRunId={editSchedule.isPending ? editSchedule.variables?.runId : undefined}
      editScheduleErrorRunId={scheduleError?.runId}
      editScheduleError={scheduleError?.message}
      onEditTargeting={handleEditTargeting}
      editTargetingPendingRunId={
        editTargeting.isPending ? editTargeting.variables?.runId : undefined
      }
      editTargetingErrorRunId={targetingError?.runId}
      editTargetingError={targetingError?.message}
      onReplaceCreative={handleReplaceCreative}
      replaceCreativePendingRunId={
        replaceCreative.isPending ? replaceCreative.variables?.runId : undefined
      }
      replaceCreativeErrorRunId={replaceCreativeError?.runId}
      replaceCreativeError={replaceCreativeError?.message}
      onReplaceDestination={handleReplaceDestination}
      replaceDestinationPendingRunId={
        replaceDestination.isPending ? replaceDestination.variables?.runId : undefined
      }
      replaceDestinationErrorRunId={replaceDestinationError?.runId}
      replaceDestinationError={replaceDestinationError?.message}
    />
  )
}
