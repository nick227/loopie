import { useMemo, useState } from 'react'
import { Upload, Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import {
  AD_CREATIVE_FORMATS,
  TEXT_PLACEMENT_OPTIONS,
  FONT_SCALE_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  OVERLAY_OPTIONS,
  CTA_PLACEMENT_OPTIONS,
  MEDIA_FOCAL_OPTIONS,
  type AdCreativeFormat,
  type AdTextPlacement,
  type AdFontScale,
  type AdTextAlign,
  type AdOverlayTreatment,
  type AdCtaPlacement,
  type AdMediaFocal,
} from '@project/ad-renderer'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PresetChipRow } from './PresetChipRow'
import { AdCreativeVisual } from '@/components/river/RiverPostPresentation'
import { mediaFileError } from '@/lib/media'

export type AdDesignerDraft = {
  name: string
  headline: string
  primaryText: string
  ctaLabel: string
  mediaUrl: string | null
  mediaAlt: string
  destinationType: 'LANDING_PAGE' | 'EXTERNAL_URL'
  destinationUrl: string
  destinationLandingPageId: string | null
  textPlacement: AdTextPlacement
  fontScale: AdFontScale
  textAlign: AdTextAlign
  overlay: AdOverlayTreatment
  ctaPlacement: AdCtaPlacement
  mediaFocal: AdMediaFocal
}

const FORMAT_LABEL: Record<AdCreativeFormat, string> = Object.fromEntries(
  AD_CREATIVE_FORMATS.map((f) => [f.value, f.label]),
) as Record<AdCreativeFormat, string>

export function AdDesigner({
  format,
  draft,
  onChange,
  publishedPages,
  onAddImage,
  uploadingMedia,
  mediaError,
  saveReady,
  pending,
  error,
  onSave,
  saveLabel = 'Save',
  advertisementId,
  lastPublishedAt,
  onPublish,
  publishPending,
  onPostToRiver,
  riverPending,
  embedSnippet,
  loadingEmbed,
  onLoadEmbed,
}: {
  format: AdCreativeFormat
  draft: AdDesignerDraft
  onChange: (patch: Partial<AdDesignerDraft>) => void
  publishedPages: { id: string; name: string; hostedUrl?: string | null }[]
  onAddImage: (file: File) => void | Promise<void>
  uploadingMedia: boolean
  mediaError: string | null
  saveReady: boolean
  pending: boolean
  error: string | null
  onSave: () => void
  saveLabel?: string
  advertisementId?: string
  lastPublishedAt?: string | null
  onPublish?: () => void
  publishPending?: boolean
  onPostToRiver?: () => void
  riverPending?: boolean
  embedSnippet?: string | null
  loadingEmbed?: boolean
  onLoadEmbed?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const previewInput = useMemo(
    () => ({
      format,
      headline: draft.headline,
      primaryText: draft.primaryText,
      ctaLabel: draft.ctaLabel,
      mediaUrl: draft.mediaUrl,
      mediaAlt: draft.mediaAlt,
      clickUrl:
        draft.destinationType === 'EXTERNAL_URL'
          ? draft.destinationUrl || null
          : (publishedPages.find((p) => p.id === draft.destinationLandingPageId)?.hostedUrl ??
            null),
      textPlacement: draft.textPlacement,
      fontScale: draft.fontScale,
      textAlign: draft.textAlign,
      overlay: draft.overlay,
      ctaPlacement: draft.ctaPlacement,
      mediaFocal: draft.mediaFocal,
    }),
    [format, draft, publishedPages],
  )

  async function handleFile(file: File | null) {
    if (!file) return
    const invalid = mediaFileError(file)
    if (invalid) return
    await onAddImage(file)
  }

  function copyEmbed() {
    if (!embedSnippet) return
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Left: content + curated design options */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {FORMAT_LABEL[format]}
          </p>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Internal name (not shown to visitors)"
            className="mt-2"
          />
        </div>

        <Card className="border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Content</p>
          <Input
            value={draft.headline}
            onChange={(e) => onChange({ headline: e.target.value })}
            placeholder="Headline"
          />
          <Textarea
            value={draft.primaryText}
            onChange={(e) => onChange({ primaryText: e.target.value })}
            placeholder="Supporting text"
            rows={3}
          />
          <Input
            value={draft.ctaLabel}
            onChange={(e) => onChange({ ctaLabel: e.target.value })}
            placeholder="CTA label (e.g. Shop now)"
          />
        </Card>

        <Card className="border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Media</p>
          {draft.mediaUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={draft.mediaUrl}
                alt=""
                className="h-16 w-16 rounded-md object-cover border border-border"
              />
              <label className="cursor-pointer text-xs text-primary underline underline-offset-2">
                Replace image
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input-border bg-muted/40 px-3 py-6 text-center hover:bg-muted/60">
              {uploadingMedia ? (
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              ) : (
                <Upload size={16} className="text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {uploadingMedia ? 'Uploading…' : 'Click to upload an image'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingMedia}
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
        </Card>

        <Card className="border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Destination</p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={draft.destinationType === 'LANDING_PAGE' ? 'default' : 'outline'}
              onClick={() => onChange({ destinationType: 'LANDING_PAGE' })}
            >
              A Loopie Page
            </Button>
            <Button
              type="button"
              size="sm"
              variant={draft.destinationType === 'EXTERNAL_URL' ? 'default' : 'outline'}
              onClick={() => onChange({ destinationType: 'EXTERNAL_URL' })}
            >
              External URL
            </Button>
          </div>
          {draft.destinationType === 'LANDING_PAGE' ? (
            <select
              aria-label="Destination page"
              value={draft.destinationLandingPageId ?? ''}
              onChange={(e) => onChange({ destinationLandingPageId: e.target.value || null })}
              className="flex h-10 w-full rounded-lg border border-input-border bg-transparent px-3 text-sm"
            >
              <option value="">Choose a published page…</option>
              {publishedPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={draft.destinationUrl}
              onChange={(e) => onChange({ destinationUrl: e.target.value })}
              placeholder="https://example.com/offer"
            />
          )}
        </Card>

        <Card className="border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">Design</p>
          <PresetChipRow
            label="Text placement"
            options={TEXT_PLACEMENT_OPTIONS}
            value={draft.textPlacement}
            onChange={(v) => onChange({ textPlacement: v })}
          />
          <PresetChipRow
            label="Text size"
            options={FONT_SCALE_OPTIONS}
            value={draft.fontScale}
            onChange={(v) => onChange({ fontScale: v })}
          />
          <PresetChipRow
            label="Alignment"
            options={TEXT_ALIGN_OPTIONS}
            value={draft.textAlign}
            onChange={(v) => onChange({ textAlign: v })}
          />
          <PresetChipRow
            label="Overlay"
            options={OVERLAY_OPTIONS}
            value={draft.overlay}
            onChange={(v) => onChange({ overlay: v })}
          />
          <PresetChipRow
            label="CTA placement"
            options={CTA_PLACEMENT_OPTIONS}
            value={draft.ctaPlacement}
            onChange={(v) => onChange({ ctaPlacement: v })}
          />
          <PresetChipRow
            label="Media focal point"
            options={MEDIA_FOCAL_OPTIONS}
            value={draft.mediaFocal}
            onChange={(v) => onChange({ mediaFocal: v })}
          />
        </Card>

        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={14} /> {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onSave} disabled={!saveReady || pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null} {saveLabel}
          </Button>
          {advertisementId && onPublish ? (
            <Button type="button" variant="outline" onClick={onPublish} disabled={publishPending}>
              {publishPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {lastPublishedAt ? 'Republish' : 'Publish'}
            </Button>
          ) : null}
          {advertisementId && lastPublishedAt && onPostToRiver ? (
            <Button type="button" variant="outline" onClick={onPostToRiver} disabled={riverPending}>
              {riverPending ? <Loader2 size={14} className="animate-spin" /> : null} Share to River
            </Button>
          ) : null}
        </div>

        {advertisementId && lastPublishedAt ? (
          <Card className="border border-border p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">Embed code</p>
            <p className="text-xs text-muted-foreground">
              Paste this on any external site — it renders the same creative, responsively, outside
              Loopie.
            </p>
            {embedSnippet ? (
              <div className="space-y-2">
                <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[11px] leading-snug">
                  {embedSnippet}
                </pre>
                <Button type="button" size="sm" variant="outline" onClick={copyEmbed}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy embed code'}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onLoadEmbed}
                disabled={loadingEmbed}
              >
                {loadingEmbed ? <Loader2 size={14} className="animate-spin" /> : null} Get embed
                code
              </Button>
            )}
          </Card>
        ) : null}
      </div>

      {/* Right: large live preview — same renderer as everywhere else this creative appears */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
        <AdCreativeVisual adCreative={previewInput} className="max-w-none" />
      </div>
    </div>
  )
}
