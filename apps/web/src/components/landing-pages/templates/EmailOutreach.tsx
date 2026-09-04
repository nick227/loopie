import { ArrowRight, Plus } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  FeatureItem,
  MetricItem,
  TestimonialItem,
  FaqItem,
} from '../../../pages/landing-pages/components/types'

// Email-shaped sales vehicle: constrained column on a soft canvas, letter hierarchy, one ask.
// Colors come only from theme tokens so any preset still recolors correctly.
const TOKEN_DEFAULTS = {
  primaryColor: '#FF2D6A',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  inkColor: '#0A0A0A',
  cardColor: '#F5F5F5',
  fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
  radius: '9999px',
}

const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`

type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
}

function AddRow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
      style={{ color: ink(55) }}
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function EmailHeader({ content, editable, onChange }: SectionProps<'nav'>) {
  const brand = content?.brand ?? ''
  return (
    <header className="border-b px-7 py-5" style={{ borderColor: ink(10) }}>
      <div className="flex items-center justify-between gap-4">
        {editable ? (
          <CanvasText
            ariaLabel="Brand name"
            value={brand}
            onChange={(next) => onChange({ brand: next })}
            placeholder="Brand"
            style={{ color: 'var(--lp-ink)', fontFamily: 'var(--lp-heading)' }}
            className="text-lg font-semibold tracking-tight"
          />
        ) : (
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--lp-ink)', fontFamily: 'var(--lp-heading)' }}
          >
            {brand}
          </span>
        )}
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: ink(45) }}
        >
          First note
        </span>
      </div>
    </header>
  )
}

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}

  return (
    <section className="px-7 pt-8 pb-2">
      {editable ? (
        <CanvasText
          ariaLabel="Hero eyebrow"
          value={content?.eyebrow ?? ''}
          onChange={(eyebrow) => onChange({ eyebrow })}
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--lp-primary)' }}
        />
      ) : content?.eyebrow ? (
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--lp-primary)' }}
        >
          {content.eyebrow}
        </p>
      ) : null}

      <div
        className="mb-5 h-px w-12"
        style={{ backgroundColor: 'color-mix(in srgb, var(--lp-ink) 22%, var(--lp-bg))' }}
        aria-hidden
      />

      {editable ? (
        <CanvasText
          as="h1"
          ariaLabel="Hero headline"
          value={content?.headline ?? ''}
          onChange={(headline) => onChange({ headline })}
          multiline
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          className="mb-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.015em] sm:text-[1.85rem]"
        />
      ) : (
        <h1
          className="mb-4 text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.015em] sm:text-[1.85rem]"
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
        >
          {content?.headline}
        </h1>
      )}

      {editable ? (
        <CanvasText
          ariaLabel="Hero body"
          value={content?.body ?? ''}
          onChange={(body) => onChange({ body })}
          multiline
          className="mb-6 text-[0.98rem] leading-[1.65]"
          style={{ color: ink(72) }}
        />
      ) : content?.body ? (
        <p className="mb-6 text-[0.98rem] leading-[1.65]" style={{ color: ink(72) }}>
          {content.body}
        </p>
      ) : null}

      {editable ? (
        <div className="mb-6">
          <EditableLinkTrigger
            label={cta.label ?? ''}
            url={cta.url ?? '#contact'}
            onChange={(next) => onChange({ primaryCta: next })}
          >
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
              style={{ color: 'var(--lp-ink)' }}
            >
              {cta.label || 'Add a call to action'} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </EditableLinkTrigger>
        </div>
      ) : cta.label ? (
        <a
          href={cta.url}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
          style={{ color: 'var(--lp-ink)' }}
        >
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : null}

      <div
        className="mt-2 overflow-hidden"
        style={{ borderRadius: 'var(--lp-radius)', backgroundColor: ink(6) }}
      >
        {editable ? (
          <MediaSlotField
            kind="IMAGE"
            urlMode
            fill
            fallbackUrl={media.url}
            onUrlChange={(url) => onChange({ media: { ...media, url } })}
          />
        ) : media.url ? (
          <img
            src={media.url}
            alt={media.alt ?? ''}
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/10] w-full" style={{ backgroundColor: ink(8) }} />
        )}
      </div>
    </section>
  )
}

function FeaturesSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []

  function updateItem(i: number, patch: Partial<FeatureItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t px-7 py-8" style={{ borderColor: ink(10) }}>
      {editable ? (
        <CanvasText
          as="h2"
          ariaLabel="Features headline"
          value={content?.headline ?? ''}
          onChange={(headline) => onChange({ headline })}
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          className="mb-2 text-xl font-semibold"
        />
      ) : content?.headline ? (
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
        >
          {content.headline}
        </h2>
      ) : null}

      {editable ? (
        <CanvasText
          ariaLabel="Features body"
          value={content?.body ?? ''}
          onChange={(body) => onChange({ body })}
          multiline
          className="mb-6 text-sm leading-relaxed"
          style={{ color: ink(65) }}
        />
      ) : content?.body ? (
        <p className="mb-6 text-sm leading-relaxed" style={{ color: ink(65) }}>
          {content.body}
        </p>
      ) : null}

      <div className="divide-y" style={{ borderColor: ink(10) }}>
        {items.map((item, i) => (
          <div key={i} className="py-5 first:pt-0 last:pb-0" style={{ borderColor: ink(10) }}>
            {editable ? (
              <CanvasText
                ariaLabel={`Feature ${i + 1} title`}
                value={item.title}
                onChange={(title) => updateItem(i, { title })}
                className="mb-1.5 text-[0.95rem] font-semibold"
                style={{ color: 'var(--lp-ink)' }}
              />
            ) : (
              <h3
                className="mb-1.5 text-[0.95rem] font-semibold"
                style={{ color: 'var(--lp-ink)' }}
              >
                {item.title}
              </h3>
            )}
            {editable ? (
              <CanvasText
                ariaLabel={`Feature ${i + 1} body`}
                value={item.body}
                onChange={(body) => updateItem(i, { body })}
                multiline
                className="text-sm leading-relaxed"
                style={{ color: ink(68) }}
              />
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: ink(68) }}>
                {item.body}
              </p>
            )}
            {editable ? (
              <button
                type="button"
                onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                className="mt-2 text-xs underline underline-offset-4"
                style={{ color: ink(50) }}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {editable ? (
        <AddRow
          label="Add point"
          onClick={() => onChange({ items: [...items, { title: 'New point', body: '' }] })}
        />
      ) : null}
    </section>
  )
}

function MetricsSection({ content, editable, onChange }: SectionProps<'metrics'>) {
  const items = content?.items ?? []

  function updateItem(i: number, patch: Partial<MetricItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t px-7 py-7" style={{ borderColor: ink(10) }}>
      <div className="grid gap-5 sm:grid-cols-3">
        {items.map((item, i) => (
          <div key={i}>
            {editable ? (
              <CanvasText
                ariaLabel={`Metric ${i + 1} value`}
                value={item.value}
                onChange={(value) => updateItem(i, { value })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="mb-1 text-2xl font-semibold tracking-tight"
              />
            ) : (
              <p
                className="mb-1 text-2xl font-semibold tracking-tight"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {item.value}
              </p>
            )}
            {editable ? (
              <CanvasText
                ariaLabel={`Metric ${i + 1} label`}
                value={item.label}
                onChange={(label) => updateItem(i, { label })}
                className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--lp-primary)' }}
              />
            ) : (
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--lp-primary)' }}
              >
                {item.label}
              </p>
            )}
            {editable ? (
              <CanvasText
                ariaLabel={`Metric ${i + 1} description`}
                value={item.description ?? ''}
                onChange={(description) => updateItem(i, { description })}
                multiline
                className="text-xs leading-relaxed"
                style={{ color: ink(60) }}
              />
            ) : item.description ? (
              <p className="text-xs leading-relaxed" style={{ color: ink(60) }}>
                {item.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {editable ? (
        <AddRow
          label="Add metric"
          onClick={() =>
            onChange({ items: [...items, { value: '0', label: 'Label', description: '' }] })
          }
        />
      ) : null}
    </section>
  )
}

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []

  function updateItem(i: number, patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t px-7 py-8" style={{ borderColor: ink(10) }}>
      {editable ? (
        <CanvasText
          ariaLabel="Testimonials headline"
          value={content?.headline ?? ''}
          onChange={(headline) => onChange({ headline })}
          className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: ink(50) }}
        />
      ) : content?.headline ? (
        <p
          className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: ink(50) }}
        >
          {content.headline}
        </p>
      ) : null}

      <div className="space-y-7">
        {items.map((item, i) => (
          <blockquote key={i} className="m-0">
            {editable ? (
              <CanvasText
                ariaLabel={`Testimonial ${i + 1} quote`}
                value={item.quote}
                onChange={(quote) => updateItem(i, { quote })}
                multiline
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="mb-3 text-[1.05rem] leading-relaxed"
              />
            ) : (
              <p
                className="mb-3 text-[1.05rem] leading-relaxed"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                “{item.quote}”
              </p>
            )}
            <footer className="flex flex-wrap items-baseline gap-x-2 text-sm">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${i + 1} author`}
                  value={item.author}
                  onChange={(author) => updateItem(i, { author })}
                  className="font-semibold"
                  style={{ color: 'var(--lp-ink)' }}
                />
              ) : (
                <cite className="not-italic font-semibold" style={{ color: 'var(--lp-ink)' }}>
                  {item.author}
                </cite>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${i + 1} role`}
                  value={item.role ?? ''}
                  onChange={(role) => updateItem(i, { role })}
                  style={{ color: ink(55) }}
                />
              ) : item.role ? (
                <span style={{ color: ink(55) }}>{item.role}</span>
              ) : null}
            </footer>
            {editable ? (
              <button
                type="button"
                onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                className="mt-2 text-xs underline underline-offset-4"
                style={{ color: ink(50) }}
              >
                Remove
              </button>
            ) : null}
          </blockquote>
        ))}
      </div>

      {editable ? (
        <AddRow
          label="Add testimonial"
          onClick={() =>
            onChange({ items: [...items, { quote: '', author: 'New client', role: '' }] })
          }
        />
      ) : null}
    </section>
  )
}

function FaqSection({ content, editable, onChange }: SectionProps<'faq'>) {
  const items = content?.items ?? []

  function updateItem(i: number, patch: Partial<FaqItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t px-7 py-8" style={{ borderColor: ink(10) }}>
      {editable ? (
        <CanvasText
          as="h2"
          ariaLabel="FAQ headline"
          value={content?.headline ?? ''}
          onChange={(headline) => onChange({ headline })}
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          className="mb-5 text-xl font-semibold"
        />
      ) : content?.headline ? (
        <h2
          className="mb-5 text-xl font-semibold"
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
        >
          {content.headline}
        </h2>
      ) : null}

      <div className="space-y-5">
        {items.map((item, i) => (
          <div key={i}>
            {editable ? (
              <CanvasText
                ariaLabel={`FAQ ${i + 1} question`}
                value={item.question}
                onChange={(question) => updateItem(i, { question })}
                className="mb-1.5 text-sm font-semibold"
                style={{ color: 'var(--lp-ink)' }}
              />
            ) : (
              <h3 className="mb-1.5 text-sm font-semibold" style={{ color: 'var(--lp-ink)' }}>
                {item.question}
              </h3>
            )}
            {editable ? (
              <CanvasText
                ariaLabel={`FAQ ${i + 1} answer`}
                value={item.answer}
                onChange={(answer) => updateItem(i, { answer })}
                multiline
                className="text-sm leading-relaxed"
                style={{ color: ink(68) }}
              />
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: ink(68) }}>
                {item.answer}
              </p>
            )}
            {editable ? (
              <button
                type="button"
                onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                className="mt-2 text-xs underline underline-offset-4"
                style={{ color: ink(50) }}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {editable ? (
        <AddRow
          label="Add question"
          onClick={() => onChange({ items: [...items, { question: '', answer: '' }] })}
        />
      ) : null}
    </section>
  )
}

function ContactSection({
  content,
  editable,
  onChange,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
}: SectionProps<'footer'> & {
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  return (
    <section id="contact" className="border-t px-7 py-9" style={{ borderColor: ink(10) }}>
      {editable ? (
        <CanvasText
          as="h2"
          ariaLabel="Contact headline"
          value={content?.headline ?? ''}
          onChange={(headline) => onChange({ headline })}
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          className="mb-2 text-xl font-semibold"
        />
      ) : (
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
        >
          {content?.headline}
        </h2>
      )}
      {editable ? (
        <CanvasText
          ariaLabel="Contact body"
          value={content?.body ?? ''}
          onChange={(body) => onChange({ body })}
          multiline
          className="mb-6 text-sm leading-relaxed"
          style={{ color: ink(68) }}
        />
      ) : content?.body ? (
        <p className="mb-6 text-sm leading-relaxed" style={{ color: ink(68) }}>
          {content.body}
        </p>
      ) : null}

      {!hasForm ? (
        <p className="text-sm" style={{ color: ink(55) }}>
          No reusable form attached. Choose a form above to embed real fields here.
        </p>
      ) : (
        <>
          <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
          <button
            type="button"
            disabled
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            style={{ color: 'var(--lp-ink)', background: 'transparent', border: 0 }}
          >
            {submitLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </section>
  )
}

export function EmailOutreach({
  content,
  theme,
  layoutConfig,
  editable = false,
  onSlotChange,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
}: {
  content?: PageContent
  theme?: Record<string, string>
  layoutConfig?: { sections?: Record<string, { hidden?: boolean }> }
  editable?: boolean
  onSlotChange?: (slotGroup: keyof PageContent, patch: unknown) => void
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  const c = content ?? {}
  const t = theme ?? {}
  const isHidden = (sectionKey: string) => Boolean(layoutConfig?.sections?.[sectionKey]?.hidden)

  function slotChange<K extends keyof PageContent>(
    key: K,
    patch: Partial<NonNullable<PageContent[K]>>,
  ) {
    onSlotChange?.(key, { ...(c[key] as object | undefined), ...patch })
  }

  return (
    <div
      className="min-h-screen px-4 py-10 antialiased sm:px-6"
      style={{
        backgroundColor: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        color: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        fontFamily: t.fontFamily ?? TOKEN_DEFAULTS.fontFamily,
        ['--lp-primary' as string]: t.primaryColor ?? TOKEN_DEFAULTS.primaryColor,
        ['--lp-on-primary' as string]: t.onPrimaryColor ?? TOKEN_DEFAULTS.onPrimaryColor,
        ['--lp-bg' as string]: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
        ['--lp-ink' as string]: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        ['--lp-card' as string]: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
        ['--lp-heading' as string]: t.headingFont ?? TOKEN_DEFAULTS.headingFont,
        ['--lp-radius' as string]: t.radius ?? TOKEN_DEFAULTS.radius,
      }}
    >
      <article
        className="mx-auto overflow-hidden shadow-sm"
        style={{
          maxWidth: 560,
          backgroundColor: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
          border: `1px solid ${ink(12)}`,
          borderRadius: 10,
        }}
      >
        <EmailHeader
          content={c.nav}
          editable={editable}
          onChange={(patch) => slotChange('nav', patch)}
        />
        <HeroSection
          content={c.hero}
          editable={editable}
          onChange={(patch) => slotChange('hero', patch)}
        />
        {!isHidden('features') && (
          <FeaturesSection
            content={c.features}
            editable={editable}
            onChange={(patch) => slotChange('features', patch)}
          />
        )}
        {!isHidden('metrics') && (
          <MetricsSection
            content={c.metrics}
            editable={editable}
            onChange={(patch) => slotChange('metrics', patch)}
          />
        )}
        {!isHidden('testimonials') && (
          <TestimonialsSection
            content={c.testimonials}
            editable={editable}
            onChange={(patch) => slotChange('testimonials', patch)}
          />
        )}
        {!isHidden('faq') && (
          <FaqSection
            content={c.faq}
            editable={editable}
            onChange={(patch) => slotChange('faq', patch)}
          />
        )}
        <ContactSection
          content={c.footer}
          editable={editable}
          onChange={(patch) => slotChange('footer', patch)}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
        />
        <footer
          className="border-t px-7 py-5 text-center text-[11px] leading-relaxed"
          style={{ borderColor: ink(10), color: ink(48) }}
        >
          Sent with care · Reply only if useful · Same-day response on business days
        </footer>
      </article>
    </div>
  )
}
