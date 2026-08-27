import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { MediaSlotField } from './MediaSlotField'
import { CanvasText } from './CanvasText'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { FeatureItem, SectionContent, TemplateSection } from './types'

export function CanvasSection({
  section,
  content,
  onChange,
  formFields,
  onFormFields,
  submitLabel,
}: {
  section: TemplateSection
  content: SectionContent
  onChange: (next: SectionContent) => void
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  const set = (patch: Partial<SectionContent>) => onChange({ ...content, ...patch })

  if (content.hidden) return null

  if (section.type === 'hero') {
    return (
      <section className="mx-auto max-w-[1040px] px-6 pb-4 pt-14 sm:pt-16">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lp-primary)]">
          Now booking
        </p>
        <CanvasText
          ariaLabel="Headline"
          value={content.headline ?? ''}
          onChange={(headline) => set({ headline })}
          placeholder="Headline"
          style={{ fontFamily: '"IBM Plex Serif", Georgia, serif' }}
          className="text-[2.6rem] font-semibold leading-[1.12] tracking-tight text-zinc-900"
        />
        <CanvasText
          ariaLabel="Subheadline"
          value={content.subheadline ?? ''}
          onChange={(subheadline) => set({ subheadline })}
          placeholder="Subheadline"
          multiline
          className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-zinc-600"
        />
        <CanvasText
          ariaLabel="CTA label"
          value={content.ctaLabel ?? ''}
          onChange={(ctaLabel) => set({ ctaLabel })}
          placeholder="Request a callback"
          className="mt-6 inline-block w-auto rounded-md bg-[var(--lp-primary)] px-6 py-3 text-sm font-medium tracking-wide text-white"
        />
        <CanvasText
          ariaLabel="CTA link"
          value={content.ctaLink ?? ''}
          onChange={(ctaLink) => set({ ctaLink })}
          placeholder="#form"
          className="mt-2 text-xs text-zinc-400"
        />
      </section>
    )
  }

  if (section.type === 'feature-grid') {
    const items = content.items ?? []
    return (
      <section className="mx-auto max-w-[1040px] px-6 py-10">
        <div className="grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 bg-white p-5">
              <CanvasText
                ariaLabel={`Feature ${i + 1} title`}
                value={item.title}
                onChange={(title) =>
                  set({ items: items.map((row, idx) => (idx === i ? { ...row, title } : row)) })
                }
                className="font-semibold"
              />
              <CanvasText
                ariaLabel={`Feature ${i + 1} body`}
                value={item.body}
                onChange={(body) =>
                  set({ items: items.map((row, idx) => (idx === i ? { ...row, body } : row)) })
                }
                multiline
                className="text-sm text-zinc-600"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => set({ items: [...items, { title: '', body: '' } as FeatureItem] })}
        >
          Add feature
        </Button>
      </section>
    )
  }

  if (section.type === 'form-embed') {
    return (
      <section id="form" className="mx-auto max-w-[1040px] px-6 py-10">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-[0_1px_0_rgba(12,28,54,0.04)]">
          <p
            className="mb-4 text-xl font-semibold text-zinc-900"
            style={{ fontFamily: '"IBM Plex Serif", Georgia, serif' }}
          >
            Tell us about the job
          </p>
          <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
          <button
            type="button"
            className="mt-4 rounded-md bg-[var(--lp-primary)] px-6 py-3 text-sm font-medium text-white"
            disabled
          >
            {submitLabel}
          </button>
        </div>
      </section>
    )
  }

  if (section.type === 'footer') {
    return (
      <footer className="mx-auto max-w-[1040px] px-6 py-10 text-center text-sm text-zinc-500">
        <CanvasText
          ariaLabel="Footer text"
          value={content.text ?? ''}
          onChange={(text) => set({ text })}
          placeholder="Footer"
          className="text-center text-sm text-zinc-500"
        />
      </footer>
    )
  }

  if (section.type === 'media-image') {
    return (
      <section className="mx-auto max-w-[1040px] px-6 py-6">
        <MediaSlotField
          kind="IMAGE"
          assetId={content.assetId}
          fallbackUrl={content.imageUrl}
          onChange={(assetId) => set({ assetId })}
          onClearFallback={() => set({ imageUrl: undefined })}
        />
      </section>
    )
  }

  if (section.type === 'media-audio') {
    return (
      <section className="mx-auto max-w-[1040px] px-6 py-6">
        <MediaSlotField
          kind="AUDIO"
          assetId={content.assetId}
          onChange={(assetId) => set({ assetId })}
        />
      </section>
    )
  }

  if (section.type === 'media-youtube') {
    const embed = content.youtubeUrl ? youtubeEmbedUrl(content.youtubeUrl) : null
    return (
      <section className="mx-auto max-w-[1040px] space-y-3 px-6 py-6">
        <Input
          aria-label="YouTube URL"
          value={content.youtubeUrl ?? ''}
          placeholder="Add a video"
          onChange={(e) => set({ youtubeUrl: e.target.value })}
        />
        {embed ? (
          <iframe
            src={embed}
            title="YouTube"
            className="aspect-video w-full rounded-lg border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <p className="text-sm text-muted-foreground">Paste a youtube.com or youtu.be URL.</p>
        )}
      </section>
    )
  }

  return null
}
