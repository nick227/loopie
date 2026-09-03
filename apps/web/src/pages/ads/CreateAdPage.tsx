import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  useCreateAdRun,
  useCreateAdvertisement,
  useCreateAsset,
  useLandingPage,
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

  // Set only when arriving from a Pages jump-off (AdsStartRow) — "promote this page" prefills the
  // destination instead of leaving the user to paste a URL by hand. A page picked from the Pages
  // list, not a raw route param, so this stays an optional convenience, not a required flow.
  const [searchParams] = useSearchParams()
  const promotedPageId = searchParams.get('pageId')
  const promotedPage = useLandingPage(promotedPageId ?? '').data?.data
  const appliedPromotedPageId = useRef<string | null>(null)
  useEffect(() => {
    if (!promotedPage || appliedPromotedPageId.current === promotedPage.id) return
    appliedPromotedPageId.current = promotedPage.id
    setName((curr) => curr || `Promote: ${promotedPage.name}`)
    setDestinationUrl((curr) => curr || promotedPage.hostedUrl || '')
  }, [promotedPage])
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

  // Set by the "Text ad" / "Video ad" starting points (AdsStartRow) — a format commitment, not a
  // stored field on Advertisement itself (there isn't one; format is just whatever media ends up
  // attached), so it only ever steers this one creation session's starting UI.
  const kind =
    searchParams.get('kind') === 'video' || searchParams.get('kind') === 'text'
      ? (searchParams.get('kind') as 'video' | 'text')
      : null
  // /ads/new is excluded from Shell.tsx's ENTITY_ROUTES regex (the same `(?!new$)` guard every
  // other entity route uses, so a literal ":id" of "new" can never bind) — this is the one place
  // that has to name itself explicitly rather than inheriting a real entity's title.
  usePageTitle(kind === 'video' ? 'New video ad' : kind === 'text' ? 'New text ad' : 'New ad')

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
      initialMediaPickerType={kind === 'video' ? 'VIDEO' : undefined}
      autoFocusPrimaryText={kind === 'text'}
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
