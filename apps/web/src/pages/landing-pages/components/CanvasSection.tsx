import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { MediaSlotField } from './MediaSlotField'
import { CanvasText } from './CanvasText'
import { CanvasSplitCapture } from './CanvasSplitCapture'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { FeatureItem, SectionContent, TemplateSection } from './types'

export type CanvasBlockProps = {
  section: TemplateSection
  content: SectionContent
  onChange: (next: SectionContent) => void
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
  set: (patch: Partial<SectionContent>) => void
}

const HeroBlock = ({ content, set }: CanvasBlockProps) => (
  <section className="mx-auto max-w-[1040px] px-6 pb-4 pt-14 sm:pt-16">
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--lp-primary)]">
      Now booking
    </p>
    <CanvasText
      ariaLabel="Headline"
      value={content.headline ?? ''}
      onChange={(headline) => set({ headline })}
      placeholder="Headline"
      style={{ fontFamily: 'var(--lp-heading)' }}
      className="text-[2.6rem] font-semibold leading-[1.12] tracking-tight"
    />
    <CanvasText
      ariaLabel="Subheadline"
      value={content.subheadline ?? ''}
      onChange={(subheadline) => set({ subheadline })}
      placeholder="Subheadline"
      multiline
      className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-[color:color-mix(in_srgb,var(--lp-ink)_72%,var(--lp-bg))]"
    />
    <CanvasText
      ariaLabel="CTA label"
      value={content.ctaLabel ?? ''}
      onChange={(ctaLabel) => set({ ctaLabel })}
      placeholder="Request a callback"
      className="mt-6 inline-block w-auto bg-[var(--lp-primary)] px-6 py-3 text-sm font-medium tracking-wide text-[color:var(--lp-on-primary)]"
      style={{ borderRadius: 'var(--lp-radius)' }}
    />
    <CanvasText
      ariaLabel="CTA link"
      value={content.ctaLink ?? ''}
      onChange={(ctaLink) => set({ ctaLink })}
      placeholder="#form"
      className="mt-2 text-xs text-[color:color-mix(in_srgb,var(--lp-ink)_55%,var(--lp-bg))]"
    />
  </section>
)

const FeatureGridBlock = ({ content, set }: CanvasBlockProps) => {
  const items = content.items ?? []
  return (
    <section className="mx-auto max-w-[1040px] px-6 py-10">
      <div
        className="grid gap-px overflow-hidden sm:grid-cols-3"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg))',
          borderRadius: 'var(--lp-radius)',
        }}
      >
        {items.map((item, i) => (
          <div key={i} className="space-y-2 p-5" style={{ backgroundColor: 'var(--lp-card)' }}>
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
              className="text-sm text-[color:color-mix(in_srgb,var(--lp-ink)_72%,var(--lp-bg))]"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 text-[color:color-mix(in_srgb,var(--lp-ink)_72%,var(--lp-bg))] hover:text-[color:var(--lp-ink)]"
        onClick={() => set({ items: [...items, { title: '', body: '' } as FeatureItem] })}
      >
        Add feature
      </Button>
    </section>
  )
}

const FormEmbedBlock = ({ hasForm, formFields, onFormFields, submitLabel }: CanvasBlockProps) => {
  if (!hasForm) {
    return (
      <section id="form" className="mx-auto max-w-[1040px] px-6 py-10">
        <div
          className="border border-dashed p-8 text-center"
          style={{
            backgroundColor: 'var(--lp-card)',
            borderColor: 'color-mix(in srgb, var(--lp-ink) 18%, var(--lp-bg))',
            borderRadius: 'var(--lp-radius)',
          }}
        >
          <p className="font-medium">No reusable form attached</p>
          <p className="mt-1 text-sm opacity-65">Choose a form above to embed real fields here.</p>
        </div>
      </section>
    )
  }
  return (
    <section id="form" className="mx-auto max-w-[1040px] px-6 py-10">
      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--lp-card)',
          border: '1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg))',
          borderRadius: 'var(--lp-radius)',
        }}
      >
        <p className="mb-4 text-xl font-semibold" style={{ fontFamily: 'var(--lp-heading)' }}>
          Tell us about the job
        </p>
        <div
          className="[&_input]:!bg-[var(--lp-bg)] [&_input]:!text-[var(--lp-ink)] [&_select]:bg-[var(--lp-bg)] [&_select]:text-[var(--lp-ink)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-ink)_65%,var(--lp-bg))] [&_button]:!text-[var(--lp-ink)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-ink)_22%,var(--lp-bg))]"
          style={{ color: 'var(--lp-ink)' }}
        >
          <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
        </div>
        <button
          type="button"
          className="mt-4 bg-[var(--lp-primary)] px-6 py-3 text-sm font-medium text-[color:var(--lp-on-primary)]"
          style={{ borderRadius: 'var(--lp-radius)' }}
          disabled
        >
          {submitLabel}
        </button>
      </div>
    </section>
  )
}

const SplitCaptureBlock = ({
  content,
  hasForm,
  formFields,
  submitLabel,
  set,
}: CanvasBlockProps) => (
  <CanvasSplitCapture
    headline={content.headline ?? ''}
    assetId={content.assetId}
    imageUrl={content.imageUrl}
    hasForm={hasForm}
    formFields={formFields}
    submitLabel={submitLabel}
    onHeadline={(headline) => set({ headline })}
    onImage={(assetId) => set({ assetId })}
    onClearImage={() => set({ imageUrl: undefined })}
  />
)

const FooterBlock = ({ content, set }: CanvasBlockProps) => (
  <footer className="mx-auto max-w-[1040px] px-6 py-10 text-center text-sm text-[color:color-mix(in_srgb,var(--lp-ink)_65%,var(--lp-bg))]">
    <CanvasText
      ariaLabel="Footer text"
      value={content.text ?? ''}
      onChange={(text) => set({ text })}
      placeholder="Footer"
      className="text-center text-sm"
    />
  </footer>
)

const MediaImageBlock = ({ content, set }: CanvasBlockProps) => (
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

const MediaAudioBlock = ({ content, set }: CanvasBlockProps) => (
  <section className="mx-auto max-w-[1040px] px-6 py-6">
    <MediaSlotField
      kind="AUDIO"
      assetId={content.assetId}
      onChange={(assetId) => set({ assetId })}
    />
  </section>
)

const MediaYoutubeBlock = ({ content, set }: CanvasBlockProps) => {
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
        <p className="text-sm text-[color:color-mix(in_srgb,var(--lp-ink)_72%,var(--lp-bg))]">
          Paste a youtube.com or youtu.be URL.
        </p>
      )}
    </section>
  )
}

// Registry mapping section types to their respective React components
export const BLOCK_REGISTRY: Record<string, React.FC<CanvasBlockProps>> = {
  hero: HeroBlock,
  'feature-grid': FeatureGridBlock,
  'form-embed': FormEmbedBlock,
  'split-capture': SplitCaptureBlock,
  footer: FooterBlock,
  'media-image': MediaImageBlock,
  'media-audio': MediaAudioBlock,
  'media-youtube': MediaYoutubeBlock,
}

export function CanvasSection(props: Omit<CanvasBlockProps, 'set'>) {
  if (props.content.hidden) return null

  const BlockComponent = BLOCK_REGISTRY[props.section.type]

  if (!BlockComponent) {
    return null
  }

  const set = (patch: Partial<SectionContent>) => props.onChange({ ...props.content, ...patch })

  return <BlockComponent {...props} set={set} />
}
