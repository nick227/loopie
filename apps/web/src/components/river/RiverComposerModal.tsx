import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  useCreateRiverPost,
  useLandingPages,
  useAdvertisements,
  useAssets,
  useBusiness,
  useCreateAsset,
  ApiError,
} from '@project/sdk'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { MediaPicker } from '@/components/media/MediaPicker'
import { useFlatPages } from '@/hooks/useFlatPages'
import { mediaSrc } from '@/lib/media'
import { RiverPostMedia, RiverPostHeaderChrome } from '@/components/river/RiverPostPresentation'

type PostMode = 'text' | 'page' | 'ad'

// One attachment at a time, images-or-video like the platform this card's geometry is modeled
// on (RiverPostMedia's own 2x2 grid is for multiple *images*, not a mixed bag) — picking a video
// replaces any images and vice versa, both here and as a real 400 server-side
// (RiverPostService.create). `assetIds` covers both image count and the single-video case (length
// 1) so the rest of the component doesn't need two near-identical branches for "how many did they
// pick."
type ComposerMedia =
  { kind: 'IMAGE'; assetIds: string[] } | { kind: 'VIDEO'; assetId: string } | null

// Copy-level nudging, not enforcement — "shape incentives, not police" (the slice-6 plan doc's
// framing of the user's own composer-guidance ask). One picked per modal open, not truly
// rotating live — that's plenty to vary the blank-page prompt without building a carousel for it.
const GUIDANCE_PROMPTS = [
  'Share work you just finished…',
  'Announce something new…',
  'Ask a question…',
  'Show progress on something…',
  'Post availability…',
]

function randomGuidancePrompt() {
  return GUIDANCE_PROMPTS[Math.floor(Math.random() * GUIDANCE_PROMPTS.length)]
}

// The first general-purpose composer in the app — text/images/video/link/CTA, or share an
// existing published Page/Ad with a caption. PostToRiverModal (embedded in AdEditor) stays as its
// own AD-only shortcut, unchanged — this is the new general entry point (CreateMenu). See the
// slice-6 plan doc.
//
// Redesign pass (see the dated "River item + composer redesign" plan): the layout now mirrors how
// a post actually renders — identity header, then media, then the caption textarea at the bottom
// — using the exact same RiverPostMedia/RiverPostHeaderChrome primitives RiverFeedCard itself
// renders through, so this is a true live preview rather than a plain form that happens to also
// post media. The two "Add images"/"Add a video" buttons are one "Add Media" button now.
export function RiverComposerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<PostMode>('text')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState<ComposerMedia>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>()
  const [selectedAdId, setSelectedAdId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [postedId, setPostedId] = useState<string | null>(null)

  const business = useBusiness()
  const createPost = useCreateRiverPost()
  const createAsset = useCreateAsset()
  // "One picked per modal open, not truly rotating live" (see GUIDANCE_PROMPTS' own comment).
  // The parent always keeps this component mounted (isOpen just toggles the early-return below),
  // so a plain lazy initializer would only ever roll once for the component's whole lifetime.
  // Rerolled instead from reset() below — already the one place every other field's state is
  // cleared on close — a plain event-driven call, not render/memo/effect, so Math.random() here
  // never runs anywhere React might transparently replay or skip it (react-hooks/purity,
  // react-hooks/set-state-in-effect, react-hooks/refs all stay clean).
  const [placeholder, setPlaceholder] = useState(randomGuidancePrompt)

  const pages = useFlatPages(useLandingPages({ status: 'PUBLISHED', limit: 50 }))
  const adsQuery = useAdvertisements({ limit: 50 })
  const publishedAds = (adsQuery.data?.data ?? []).filter((ad) => ad.lastPublishedAt)
  // Same "one bulk fetch, filter client-side" pattern as BusinessGalleryField.tsx — gallery-sized
  // asset counts, not full pagination. Both types are fetched (not just IMAGE) so an id toggled
  // from the picker's own unlocked All/Image/Video browser can be resolved back to its type here.
  const allImageAssets = useFlatPages(useAssets({ type: 'IMAGE', limit: 100 }))
  const allVideoAssets = useFlatPages(useAssets({ type: 'VIDEO', limit: 100 }))

  const imageIds = media?.kind === 'IMAGE' ? media.assetIds : []
  const imageUrls = imageIds
    .map((id) => allImageAssets.find((a) => a.id === id)?.url)
    .filter((url): url is string => Boolean(url))
  const videoUrl =
    media?.kind === 'VIDEO'
      ? (allVideoAssets.find((a) => a.id === media.assetId)?.url ?? undefined)
      : undefined

  function reset() {
    setMode('text')
    setBody('')
    setMedia(null)
    setLinkUrl('')
    setCtaLabel('')
    setCtaUrl('')
    setSelectedPageId(undefined)
    setSelectedAdId(undefined)
    setError(null)
    setPostedId(null)
    createPost.reset()
    setPlaceholder(randomGuidancePrompt())
  }

  function handleClose() {
    reset()
    onClose()
  }

  // The one place "one type at a time" is actually enforced: a video always replaces whatever was
  // selected; an image replaces a prior video outright, or toggles within the existing image set.
  function toggleMediaAsset(id: string, type: 'IMAGE' | 'VIDEO') {
    if (type === 'VIDEO') {
      setMedia((prev) =>
        prev?.kind === 'VIDEO' && prev.assetId === id ? null : { kind: 'VIDEO', assetId: id },
      )
      return
    }
    setMedia((prev) => {
      if (prev?.kind !== 'IMAGE') return { kind: 'IMAGE', assetIds: [id] }
      const assetIds = prev.assetIds.includes(id)
        ? prev.assetIds.filter((existing) => existing !== id)
        : [...prev.assetIds, id]
      return assetIds.length ? { kind: 'IMAGE', assetIds } : null
    })
  }

  async function handleSubmit() {
    setError(null)
    if (Boolean(ctaLabel.trim()) !== Boolean(ctaUrl.trim())) {
      setError('A call-to-action needs both a label and a URL.')
      return
    }
    const shared = {
      body: body.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
    }
    try {
      if (mode === 'text') {
        if (!body.trim() && !media && !linkUrl.trim()) {
          setError('Add some text, an image, a video, or a link.')
          return
        }
        const result = await createPost.mutateAsync({
          type: 'TEXT',
          ...shared,
          imageAssetIds: media?.kind === 'IMAGE' ? media.assetIds : undefined,
          videoAssetId: media?.kind === 'VIDEO' ? media.assetId : undefined,
          linkUrl: linkUrl.trim() || undefined,
        })
        showPosted(result.data!.id)
      } else if (mode === 'page') {
        if (!selectedPageId) {
          setError('Pick a page to share.')
          return
        }
        const result = await createPost.mutateAsync({
          type: 'PAGE',
          landingPageId: selectedPageId,
          ...shared,
        })
        showPosted(result.data!.id)
      } else {
        if (!selectedAdId) {
          setError('Pick an ad to share.')
          return
        }
        const result = await createPost.mutateAsync({
          type: 'AD',
          advertisementId: selectedAdId,
          ...shared,
        })
        showPosted(result.data!.id)
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not post — please try again.',
      )
    }
  }

  function showPosted(id: string) {
    setPostedId(id)
  }

  if (!isOpen) return null

  if (postedId) {
    return (
      <Modal title="Posted to River" onClose={handleClose}>
        <div className="flex flex-col items-center justify-center gap-4 p-6 py-10 text-center">
          <p className="text-base font-medium">Your post is live</p>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Post to River" onClose={handleClose} size="xl">
      <div className="mx-auto max-w-xl space-y-4 p-5 sm:p-6">
        <div className="flex gap-2">
          {(['text', 'page', 'ad'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'text' ? 'Post' : m === 'page' ? 'Share a page' : 'Share an ad'}
            </button>
          ))}
        </div>

        {/* Live preview header — the real avatar/name, so this reads as an actual draft of the
            post rather than a bare form. No Follow/overflow controls: nothing to act on yet. */}
        <RiverPostHeaderChrome
          avatarSrc={mediaSrc(business.data?.data?.logoUrl)}
          name={business.data?.data?.name ?? 'Your business'}
          subtitle="Just now"
        />

        {mode === 'text' &&
          (media ? (
            <div className="group relative">
              <RiverPostMedia images={imageUrls} video={videoUrl} />
              <button
                type="button"
                onClick={() => setMedia(null)}
                aria-label="Remove media"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-background"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="mt-2 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {media.kind === 'IMAGE' ? 'Add or change photos' : 'Replace video'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <ImagePlus size={22} />
              <span className="text-sm font-medium">Add photos or a video</span>
            </button>
          ))}

        {mode === 'page' && (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {pages.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No published pages yet.</p>
            ) : (
              pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedPageId(page.id)}
                  className={`block w-full rounded-md px-2.5 py-2 text-left text-sm ${
                    selectedPageId === page.id ? 'bg-accent font-medium' : 'hover:bg-accent'
                  }`}
                >
                  {page.name}
                </button>
              ))
            )}
          </div>
        )}

        {mode === 'ad' && (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {publishedAds.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No published ads yet.</p>
            ) : (
              publishedAds.map((ad) => (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => setSelectedAdId(ad.id)}
                  className={`block w-full rounded-md px-2.5 py-2 text-left text-sm ${
                    selectedAdId === ad.id ? 'bg-accent font-medium' : 'hover:bg-accent'
                  }`}
                >
                  {ad.name}
                </button>
              ))
            )}
          </div>
        )}

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={mode === 'text' ? placeholder : 'Say something about it (optional)'}
          rows={4}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={createPost.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={createPost.isPending}>
            {createPost.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>

      {mediaPickerOpen ? (
        <MediaPicker
          selectedIds={
            media?.kind === 'IMAGE'
              ? media.assetIds
              : media?.kind === 'VIDEO'
                ? [media.assetId]
                : []
          }
          adding={createAsset.isPending}
          onToggle={(id) => {
            const type = allVideoAssets.some((a) => a.id === id) ? 'VIDEO' : 'IMAGE'
            toggleMediaAsset(id, type)
          }}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            if (result.data)
              toggleMediaAsset(result.data.id, result.data.type === 'VIDEO' ? 'VIDEO' : 'IMAGE')
          }}
          onConfirm={() => setMediaPickerOpen(false)}
          onClose={() => setMediaPickerOpen(false)}
        />
      ) : null}
    </Modal>
  )
}
