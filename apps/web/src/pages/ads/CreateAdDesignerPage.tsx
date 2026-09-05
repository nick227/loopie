import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  useCreateAdvertisement,
  useUpdateAdvertisement,
  usePublishAdvertisement,
  useCreateAsset,
  useCreateRiverPost,
  useLandingPages,
  useGetOrCreateEmbedDeployment,
} from '@project/sdk'
import { resolveAdCreativeDesign, type AdCreativeFormat } from '@project/ad-renderer'
import { AdDesigner, type AdDesignerDraft } from '@/components/ads/AdDesigner'
import { useFlatPages } from '@/hooks/useFlatPages'
import { usePageTitle } from '@/lib/headerContext'
import { AD_SERVER_URL } from '@/lib/adPlatformConfig'
import { probeFile, fileToDataUrl } from '@/lib/probeMedia'
import { mediaSrc } from '@/lib/media'

// This format's own preset defaults (see @project/ad-renderer's FORMAT_DEFAULTS) — a Story starts
// as a Story, not a Poster with the label changed. Everything else about a fresh draft is
// format-agnostic.
function emptyDraft(format: AdCreativeFormat): AdDesignerDraft {
  const design = resolveAdCreativeDesign(format, {})
  return {
    name: '',
    headline: '',
    primaryText: '',
    ctaLabel: '',
    mediaUrl: null,
    mediaAlt: '',
    destinationType: 'EXTERNAL_URL',
    destinationUrl: '',
    destinationLandingPageId: null,
    textPlacement: design.textPlacement,
    fontScale: design.fontScale,
    textAlign: design.textAlign,
    overlay: design.overlay,
    ctaPlacement: design.ctaPlacement,
    mediaFocal: design.mediaFocal,
  }
}

const FORMAT_TITLE: Record<AdCreativeFormat, string> = {
  POSTER: 'New poster',
  STORY: 'New story',
  FEED_POST: 'New feed post',
}

// The Ad Designer's create flow — see CLAUDE.md's Ad Designer entry. Compose → save (creates the
// Advertisement on first save, then just updates it) → publish → share to River / copy embed
// code, all without leaving this page. Mirrors CreateAdPage's own "save creates, then updates"
// pattern for the pre-existing generic-ad flow.
export function CreateAdDesignerPage({
  format,
  pageId,
}: {
  format: AdCreativeFormat
  pageId?: string
}) {
  usePageTitle(FORMAT_TITLE[format])
  const navigate = useNavigate()
  const createAd = useCreateAdvertisement()
  const updateAd = useUpdateAdvertisement()
  const publishAd = usePublishAdvertisement()
  const createAsset = useCreateAsset()
  const createRiverPost = useCreateRiverPost()
  const getOrCreateEmbed = useGetOrCreateEmbedDeployment()

  const publishedPages = useFlatPages(useLandingPages({ status: 'PUBLISHED', limit: 100 }))

  const [draft, setDraft] = useState<AdDesignerDraft>(() => {
    const base = emptyDraft(format)
    return pageId
      ? { ...base, destinationType: 'LANDING_PAGE', destinationLandingPageId: pageId }
      : base
  })
  const [advertisementId, setAdvertisementId] = useState<string | null>(null)
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [embedSnippet, setEmbedSnippet] = useState<string | null>(null)
  // An image uploaded before the Advertisement has been saved once yet — attached on the next
  // save() call rather than requiring the user to save first, upload second.
  const pendingAssetId = useRef<string | null>(null)

  function patch(next: Partial<AdDesignerDraft>) {
    setDraft((prev) => ({ ...prev, ...next }))
  }

  function toApiInput() {
    return {
      name: draft.name,
      headline: draft.headline || undefined,
      primaryText: draft.primaryText || undefined,
      ctaLabel: draft.ctaLabel || undefined,
      format,
      textPlacement: draft.textPlacement,
      fontScale: draft.fontScale,
      textAlign: draft.textAlign,
      overlay: draft.overlay,
      ctaPlacement: draft.ctaPlacement,
      mediaFocal: draft.mediaFocal,
      destinationType: draft.destinationType,
      destinationUrl: draft.destinationType === 'EXTERNAL_URL' ? draft.destinationUrl : undefined,
      destinationLandingPageId:
        draft.destinationType === 'LANDING_PAGE'
          ? (draft.destinationLandingPageId ?? undefined)
          : undefined,
    }
  }

  async function save() {
    setError(null)
    try {
      if (advertisementId) {
        await updateAd.mutateAsync({ id: advertisementId, ...toApiInput() })
        return advertisementId
      }
      const result = await createAd.mutateAsync(toApiInput())
      const id = result.data?.id
      if (!id) throw new Error('Could not save ad')
      setAdvertisementId(id)
      return id
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad')
      throw err
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
      // Save the attachment immediately so the draft's assetIds stay in sync with what's shown —
      // a save-on-every-field-change auto-persist isn't in scope here, but media should never be
      // "visually attached" without actually being attached server-side.
      if (advertisementId && asset?.id) {
        await updateAd.mutateAsync({ id: advertisementId, assetIds: [asset.id] })
      } else {
        pendingAssetId.current = asset?.id ?? null
      }
    } catch (err) {
      setMediaError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not upload image',
      )
    }
  }

  async function handleSave() {
    const id = await save()
    if (pendingAssetId.current) {
      await updateAd.mutateAsync({ id, assetIds: [pendingAssetId.current] })
      pendingAssetId.current = null
    }
    navigate(`/ads/${id}`)
  }

  async function handlePublish() {
    if (!advertisementId) return
    setError(null)
    try {
      await save()
      await publishAd.mutateAsync({ id: advertisementId })
      setLastPublishedAt(new Date().toISOString())
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not publish ad',
      )
    }
  }

  async function handlePostToRiver() {
    if (!advertisementId) return
    setError(null)
    try {
      await createRiverPost.mutateAsync({
        type: 'AD',
        advertisementId,
        body: draft.headline || draft.name,
      })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Could not post to River',
      )
    }
  }

  async function handleLoadEmbed() {
    if (!advertisementId) return
    const result = await getOrCreateEmbed.mutateAsync({
      objectType: 'ADVERTISEMENT',
      objectId: advertisementId,
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
      pending={createAd.isPending || updateAd.isPending}
      error={error}
      onSave={() => void handleSave()}
      advertisementId={advertisementId ?? undefined}
      lastPublishedAt={lastPublishedAt}
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
