import { useRef, useState } from 'react'
import type { components } from '@project/sdk'
import {
  ApiError,
  useUpdateAdvertisement,
  usePublishAdvertisement,
  useCreateAsset,
  useCreateRiverPost,
  useLandingPages,
  useGetOrCreateEmbedDeployment,
} from '@project/sdk'
import type { AdCreativeFormat } from '@project/ad-renderer'
import { AdDesigner, type AdDesignerDraft } from '@/components/ads/AdDesigner'
import { useFlatPages } from '@/hooks/useFlatPages'
import { usePageTitle } from '@/lib/headerContext'
import { AD_SERVER_URL } from '@/lib/adServer'
import { probeFile, fileToDataUrl } from '@/lib/probeMedia'
import { mediaSrc } from '@/lib/media'

type Advertisement = components['schemas']['Advertisement']

// Reopen an already-saved Ad Designer creative "with the same appearance" (CLAUDE.md's Ad
// Designer success criteria) — hydrates AdDesigner's draft straight from the persisted
// Advertisement row, every design field already resolved (never a sparse partial, see
// AdvertisementService.update's designFieldsFrom). Mirrors CreateAdDesignerPage's save/publish/
// river/embed flow, just starting from real data instead of an empty draft.
export function EditAdDesignerPage({ ad }: { ad: Advertisement }) {
  usePageTitle(ad.name || 'Ad')
  const updateAd = useUpdateAdvertisement()
  const publishAd = usePublishAdvertisement()
  const createAsset = useCreateAsset()
  const createRiverPost = useCreateRiverPost()
  const getOrCreateEmbed = useGetOrCreateEmbedDeployment()
  const publishedPages = useFlatPages(useLandingPages({ status: 'PUBLISHED', limit: 100 }))

  const format = ad.format as AdCreativeFormat
  const image = ad.assets?.find((a) => a.type === 'IMAGE')

  const [draft, setDraft] = useState<AdDesignerDraft>({
    name: ad.name,
    headline: ad.headline ?? '',
    primaryText: ad.primaryText ?? '',
    ctaLabel: ad.ctaLabel ?? '',
    mediaUrl: mediaSrc(image?.url),
    mediaAlt: '',
    destinationType: (ad.destinationType as AdDesignerDraft['destinationType']) ?? 'EXTERNAL_URL',
    destinationUrl: ad.destinationUrl ?? '',
    destinationLandingPageId: ad.destinationLandingPageId ?? null,
    textPlacement: ad.textPlacement ?? 'BOTTOM_LEFT',
    fontScale: ad.fontScale ?? 'STANDARD',
    textAlign: ad.textAlign ?? 'LEFT',
    overlay: ad.overlay ?? 'DARK_GRADIENT',
    ctaPlacement: ad.ctaPlacement ?? 'BENEATH_COPY',
    mediaFocal: ad.mediaFocal ?? 'CENTER',
  })
  const [error, setError] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [embedSnippet, setEmbedSnippet] = useState<string | null>(null)
  const uploadedAssetId = useRef<string | null>(null)

  function patch(next: Partial<AdDesignerDraft>) {
    setDraft((prev) => ({ ...prev, ...next }))
  }

  function toApiInput() {
    return {
      name: draft.name,
      headline: draft.headline || null,
      primaryText: draft.primaryText || null,
      ctaLabel: draft.ctaLabel || null,
      textPlacement: draft.textPlacement,
      fontScale: draft.fontScale,
      textAlign: draft.textAlign,
      overlay: draft.overlay,
      ctaPlacement: draft.ctaPlacement,
      mediaFocal: draft.mediaFocal,
      destinationType: draft.destinationType,
      destinationUrl:
        draft.destinationType === 'EXTERNAL_URL' ? draft.destinationUrl || null : null,
      destinationLandingPageId:
        draft.destinationType === 'LANDING_PAGE' ? draft.destinationLandingPageId : null,
      ...(uploadedAssetId.current ? { assetIds: [uploadedAssetId.current] } : {}),
    }
  }

  async function handleSave() {
    setError(null)
    try {
      await updateAd.mutateAsync({ id: ad.id, ...toApiInput() })
      uploadedAssetId.current = null
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad')
    }
  }

  async function handleAddImage(file: File) {
    setMediaError(null)
    try {
      const probed = await probeFile(file)
      const data = await fileToDataUrl(file)
      const result = await createAsset.mutateAsync({
        type: 'IMAGE',
        name: draft.name || file.name,
        mimeType: probed.mimeType,
        sizeBytes: probed.sizeBytes,
        widthPx: probed.widthPx,
        heightPx: probed.heightPx,
        file: { filename: file.name, mimeType: probed.mimeType, data },
      })
      const asset = result.data
      if (asset?.url) patch({ mediaUrl: mediaSrc(asset.url) })
      if (asset?.id) {
        uploadedAssetId.current = asset.id
        await updateAd.mutateAsync({ id: ad.id, assetIds: [asset.id] })
        uploadedAssetId.current = null
      }
    } catch (err) {
      setMediaError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not upload image',
      )
    }
  }

  async function handlePublish() {
    setError(null)
    try {
      await updateAd.mutateAsync({ id: ad.id, ...toApiInput() })
      await publishAd.mutateAsync({ id: ad.id })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not publish ad',
      )
    }
  }

  async function handlePostToRiver() {
    setError(null)
    try {
      await createRiverPost.mutateAsync({
        type: 'AD',
        advertisementId: ad.id,
        body: draft.headline || draft.name,
      })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not post to River',
      )
    }
  }

  async function handleLoadEmbed() {
    const result = await getOrCreateEmbed.mutateAsync({
      objectType: 'ADVERTISEMENT',
      objectId: ad.id,
    })
    const publicId = result.data?.publicId
    if (!publicId) return
    setEmbedSnippet(
      `<div class="loopie-embed" data-public-id="${publicId}" style="width:100%;max-width:400px;aspect-ratio:${
        format === 'STORY' ? '9/16' : format === 'FEED_POST' ? '1/1' : '4/5'
      };"></div>\n<script src="${AD_SERVER_URL}/v1.js" async></script>`,
    )
  }

  return (
    <AdDesigner
      format={format}
      draft={draft}
      onChange={patch}
      publishedPages={publishedPages}
      onAddImage={handleAddImage}
      uploadingMedia={createAsset.isPending}
      mediaError={mediaError}
      saveReady={draft.name.trim().length > 0}
      pending={updateAd.isPending}
      error={error}
      onSave={() => void handleSave()}
      saveLabel="Save"
      advertisementId={ad.id}
      lastPublishedAt={ad.lastPublishedAt ?? null}
      onPublish={() => void handlePublish()}
      publishPending={publishAd.isPending}
      onPostToRiver={() => void handlePostToRiver()}
      riverPending={createRiverPost.isPending}
      embedSnippet={embedSnippet}
      loadingEmbed={getOrCreateEmbed.isPending}
      onLoadEmbed={() => void handleLoadEmbed()}
    />
  )
}
