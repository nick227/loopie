import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { components } from '@project/sdk'
import {
  ApiError,
  useAdRuns,
  useAdvertisement,
  useCreateAdRun,
  useCreateAsset,
  usePauseAdRun,
  useResumeAdRun,
  useUpdateAdvertisement,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdEditor } from '@/components/ads/AdEditor'
import { startAdRuns } from '@/lib/startAdRuns'

export function AdPage() {
  const { adId } = useParams<{ adId: string }>()
  const adQuery = useAdvertisement(adId ?? '')
  const runsQuery = useAdRuns(adId ?? '')

  if (adQuery.isLoading) return <Skeleton className="mx-auto h-48 w-full max-w-2xl" />
  const ad = adQuery.data?.data
  if (!ad) return <p className="text-center text-muted-foreground">Ad not found.</p>

  return (
    <AdPageEditor
      id={ad.id}
      name={ad.name}
      assetIds={ad.assetIds}
      runs={runsQuery.data?.data ?? []}
    />
  )
}

function AdPageEditor({
  id,
  name: initialName,
  assetIds: initialIds,
  runs,
}: {
  id: string
  name: string
  assetIds: string[]
  runs: components['schemas']['AdRun'][]
}) {
  const createAsset = useCreateAsset()
  const updateAd = useUpdateAdvertisement()
  const createRun = useCreateAdRun()
  const pauseRun = usePauseAdRun()
  const resumeRun = useResumeAdRun()
  const [name, setName] = useState(initialName)
  const [assetIds, setAssetIds] = useState(initialIds)
  const [error, setError] = useState<string | null>(null)
  const pending =
    updateAd.isPending ||
    createAsset.isPending ||
    createRun.isPending ||
    pauseRun.isPending ||
    resumeRun.isPending

  return (
    <AdEditor
      heading={name || 'Ad'}
      name={name}
      assetIds={assetIds}
      runs={runs}
      pending={pending}
      error={error}
      onName={setName}
      onAssetIds={setAssetIds}
      onAddAsset={async (input) => {
        const result = await createAsset.mutateAsync(input)
        const nextId = result.data?.id
        if (nextId) setAssetIds([nextId])
      }}
      onSave={async () => {
        setError(null)
        try {
          await updateAd.mutateAsync({ id, name, assetIds })
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
          )
        }
      }}
      onStartNew={async (targets) => {
        setError(null)
        try {
          await updateAd.mutateAsync({ id, name, assetIds })
          await startAdRuns(id, targets, createRun.mutateAsync, resumeRun.mutateAsync)
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not start ad',
          )
        }
      }}
      onStartRun={(runId) => resumeRun.mutate({ advertisementId: id, runId })}
      onPauseRun={(runId) => pauseRun.mutate({ advertisementId: id, runId })}
      onStartAll={() => {
        for (const run of runs) {
          if (run.status === 'PENDING' || run.status === 'PAUSED') {
            resumeRun.mutate({ advertisementId: id, runId: run.id })
          }
        }
      }}
      onPauseAll={() => {
        for (const run of runs) {
          if (run.status === 'ACTIVE') pauseRun.mutate({ advertisementId: id, runId: run.id })
        }
      }}
    />
  )
}
