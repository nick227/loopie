import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  useCreateAdRun,
  useCreateAdvertisement,
  useCreateAsset,
  useResumeAdRun,
  useUpdateAdvertisement,
} from '@project/sdk'
import { AdEditor } from '@/components/ads/AdEditor'
import { startAdRuns } from '@/lib/startAdRuns'
import { usePageTitle } from '@/lib/headerContext'

export function CreateAdPage() {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()
  const createAd = useCreateAdvertisement()
  const updateAd = useUpdateAdvertisement()
  const createRun = useCreateAdRun()
  const resumeRun = useResumeAdRun()
  const [name, setName] = useState('')
  const [primaryText, setPrimaryText] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  // Set once the Advertisement itself is first persisted, so a retry after a failed run-send
  // (bad budget, bad dates, a connector rejection) updates that same draft instead of creating a
  // second Advertisement — the draft is never silently duplicated or lost on retry.
  const adId = useRef<string | undefined>(undefined)
  const pending =
    createAd.isPending ||
    updateAd.isPending ||
    createAsset.isPending ||
    createRun.isPending ||
    resumeRun.isPending
  // /ads/new is excluded from Shell.tsx's ENTITY_ROUTES regex (the same `(?!new$)` guard every
  // other entity route uses, so a literal ":id" of "new" can never bind) — this is the one place
  // that has to name itself explicitly rather than inheriting a real entity's title.
  usePageTitle('New ad')

  async function saveAd() {
    if (adId.current) {
      await updateAd.mutateAsync({
        id: adId.current,
        name,
        primaryText,
        ctaLabel,
        destinationUrl,
        assetIds,
      })
      return adId.current
    }
    const result = await createAd.mutateAsync({
      name,
      primaryText,
      ctaLabel,
      destinationUrl,
      assetIds,
    })
    const id = result.data?.id
    if (!id) throw new Error('Could not save ad')
    adId.current = id
    return id
  }

  return (
    <AdEditor
      name={name}
      primaryText={primaryText}
      ctaLabel={ctaLabel}
      destinationUrl={destinationUrl}
      assetIds={assetIds}
      runs={[]}
      pending={pending}
      error={error}
      onName={setName}
      onPrimaryText={setPrimaryText}
      onCtaLabel={setCtaLabel}
      onDestinationUrl={setDestinationUrl}
      onAssetIds={setAssetIds}
      onAddAsset={async (input) => {
        const result = await createAsset.mutateAsync(input)
        const id = result.data?.id
        if (id) setAssetIds([id])
      }}
      saveReady={name.trim().length > 0}
      onSave={async () => {
        setError(null)
        try {
          navigate(`/ads/${await saveAd()}`)
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
          )
        }
      }}
      onSend={async (targets) => {
        setError(null)
        try {
          const id = await saveAd()
          await startAdRuns(id, targets, createRun.mutateAsync, resumeRun.mutateAsync)
          navigate(`/ads/${id}`)
        } catch (err) {
          // Never navigate away on a failed send — the draft is already saved (see saveAd above),
          // but leaving this page would hide the reason nothing was sent. Stay put, surface it.
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not send ad',
          )
        }
      }}
    />
  )
}
