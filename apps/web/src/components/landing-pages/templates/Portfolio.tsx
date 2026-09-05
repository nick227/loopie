import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  ServiceItem,
  NavLink,
} from '../../../pages/landing-pages/components/types'

// Same token vocabulary/fallbacks as every other rich template. Portfolio's own register — quiet,
// visual-first, editorial — comes entirely from type weight/scale, generous whitespace, and large
// unadorned imagery, never from hardcoded colors, so any theme still recolors this correctly.
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
      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
      style={{ color: ink(60) }}
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

// --- Nav — bare wordmark + one link, no backdrop, no chrome. Weight is medium, not bold — this
// template never shouts. ---------------------------------------------------------------------

function NavBar({ content, editable, onChange }: SectionProps<'nav'>) {
  const brand = content?.brand ?? ''
  const links = content?.links ?? []
  const primary = links[0]

  function updateLink(i: number, patch: Partial<NavLink>) {
    onChange({ links: links.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <header className="border-b" style={{ borderColor: ink(10) }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Brand name"
            value={brand}
            onChange={(next) => onChange({ brand: next })}
            placeholder="Studio name"
            style={{ color: 'var(--lp-ink)' }}
            className="text-lg font-medium tracking-tight w-auto"
          />
        ) : (
          <span className="text-lg font-medium tracking-tight" style={{ color: 'var(--lp-ink)' }}>
            {brand}
          </span>
        )}

        {editable ? (
          <EditableLinkTrigger
            label={primary?.label ?? ''}
            url={primary?.url ?? '#contact'}
            onChange={(next) => (links.length ? updateLink(0, next) : onChange({ links: [next] }))}
          >
            <span
              className="text-sm font-medium underline underline-offset-4"
              style={{ color: 'var(--lp-ink)' }}
            >
              {primary?.label || 'Add a link'}
            </span>
          </EditableLinkTrigger>
        ) : primary?.label ? (
          <a
            href={primary.url}
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: 'var(--lp-ink)' }}
          >
            {primary.label}
          </a>
        ) : null}
      </div>
    </header>
  )
}

// --- Hero — full-bleed media with overlaid left-aligned brutal headline so pitch + CTA land in
// the first viewport (Noisefracture editorial). Dark gradient from bottom/left; text uses --lp-bg.

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}

  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 300])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 1], [0, -150])

  const reducedMotion = useReducedMotion()
  const isCapture =
    typeof document !== 'undefined' && document.documentElement.hasAttribute('data-lp-capture')
  const disableMotion = reducedMotion || isCapture

  return (
    <section ref={ref} className="relative h-screen min-h-[800px] overflow-hidden bg-black">
      <motion.div
        style={disableMotion ? {} : { y: imageY, scale: imageScale }}
        className="absolute inset-0 [&>div]:h-full [&>div]:min-h-full opacity-60"
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
          <img src={media.url} alt={media.alt || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: ink(12) }} />
        )}
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      <motion.div
        style={disableMotion ? {} : { opacity, y: textY }}
        className="relative z-10 mx-auto flex h-full flex-col justify-center px-6 text-center sm:px-12 lg:px-20 mix-blend-difference pointer-events-none"
      >
        <div className="w-full text-center flex flex-col items-center pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {editable ? (
              <CanvasText
                ariaLabel="Hero eyebrow"
                value={content?.eyebrow ?? ''}
                onChange={(eyebrow) => onChange({ eyebrow })}
                placeholder="Eyebrow"
                className="mb-8 block w-fit text-lg font-black uppercase tracking-[0.6em]"
                style={{ color: '#fff' }}
              />
            ) : content?.eyebrow ? (
              <p
                className="mb-8 text-lg font-black uppercase tracking-[0.6em]"
                style={{ color: '#fff' }}
              >
                {content.eyebrow}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{ fontFamily: 'var(--lp-heading)', color: '#fff' }}
                className="mb-10 text-center text-[15vw] font-black leading-[0.8] tracking-tighter uppercase"
              />
            ) : (
              <h1
                className="mb-10 text-[15vw] font-black leading-[0.8] tracking-tighter uppercase"
                style={{ fontFamily: 'var(--lp-heading)', color: '#fff' }}
              >
                {content?.headline}
              </h1>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {editable ? (
              <CanvasText
                ariaLabel="Hero body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                placeholder="A short line about the work."
                style={{ color: 'rgba(255,255,255,0.7)' }}
                className="mb-16 max-w-3xl text-3xl font-medium leading-snug sm:text-4xl"
              />
            ) : content?.body ? (
              <p
                className="mb-16 max-w-3xl text-3xl font-medium leading-snug sm:text-4xl"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {content.body}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {editable ? (
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ primaryCta: next })}
              >
                <span
                  className="inline-flex items-center gap-4 px-12 py-6 text-2xl font-bold tracking-widest uppercase transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: '#fff',
                    color: '#000',
                    borderRadius: '9999px',
                  }}
                >
                  {cta.label || 'Explore'} <ArrowRight className="h-6 w-6" />
                </span>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <a
                href={cta.url}
                className="inline-flex items-center gap-4 px-12 py-6 text-2xl font-bold tracking-widest uppercase transition-transform hover:scale-110 cursor-pointer no-underline"
                style={{
                  backgroundColor: '#fff',
                  color: '#000',
                  borderRadius: '9999px',
                }}
              >
                {cta.label} <ArrowRight className="h-6 w-6" />
              </a>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

// --- Featured work — full-width projects with a left-aligned caption rail (not centered mush).

function ServiceSelectorSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<ServiceItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section
      id="services"
      className="h-screen min-h-[900px] w-full relative flex flex-col justify-center px-6 lg:px-20 bg-black overflow-hidden"
      style={{ borderColor: ink(10) }}
    >
      <div className="absolute top-16 left-6 lg:left-20 z-20 mix-blend-difference pointer-events-none">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Featured work title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Featured work"
            style={{ fontFamily: 'var(--lp-heading)' }}
            className="text-left text-sm font-black tracking-[0.4em] uppercase text-white"
          />
        ) : (
          <h2
            className="text-left text-sm font-black tracking-[0.4em] uppercase text-white"
            style={{ fontFamily: 'var(--lp-heading)' }}
          >
            {content?.title}
          </h2>
        )}
      </div>

      <div className="flex w-full h-[80vh] overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-32 lg:gap-64 items-center pl-10 pr-[50vw]">
        {items.map((service, i) => (
          <div
            key={i}
            className="group relative flex-none w-[75vw] md:w-[45vw] lg:w-[30vw] snap-center h-[60vh] md:h-[70vh]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0.5 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full overflow-hidden"
            >
              {editable ? (
                <MediaSlotField
                  kind="IMAGE"
                  urlMode
                  fill
                  fallbackUrl={service.media?.url}
                  onUrlChange={(url) => updateItem(i, { media: { ...service.media, url } })}
                />
              ) : service.media?.url ? (
                <img
                  src={service.media.url}
                  alt={service.media.alt ?? ''}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: ink(12) }} />
              )}
            </motion.div>

            <div className="absolute inset-0 flex flex-col justify-center pointer-events-none z-10 mix-blend-difference">
              <div className="pointer-events-auto absolute top-1/2 -translate-y-1/2 left-[-10vw] right-[-10vw] flex flex-col items-center text-center">
                {editable ? (
                  <CanvasText
                    ariaLabel={`Project ${i + 1} label`}
                    value={service.label}
                    onChange={(label) => updateItem(i, { label })}
                    className="mb-8 block w-fit text-sm font-bold uppercase tracking-[0.6em] text-white"
                  />
                ) : (
                  <p className="mb-8 block w-fit text-sm font-bold uppercase tracking-[0.6em] text-white">
                    {service.label}
                  </p>
                )}
                {editable ? (
                  <CanvasText
                    as="h3"
                    ariaLabel={`Project ${i + 1} headline`}
                    value={service.headline ?? ''}
                    onChange={(headline) => updateItem(i, { headline })}
                    style={{ fontFamily: 'var(--lp-heading)' }}
                    className="mb-12 text-[12vw] md:text-[8vw] font-black text-white leading-[0.85] tracking-tighter uppercase whitespace-nowrap"
                  />
                ) : (
                  <h3
                    className="mb-12 text-[12vw] md:text-[8vw] font-black text-white leading-[0.85] tracking-tighter uppercase whitespace-nowrap"
                    style={{ fontFamily: 'var(--lp-heading)' }}
                  >
                    {service.headline}
                  </h3>
                )}
                {editable ? (
                  <EditableLinkTrigger
                    label={service.cta?.label ?? ''}
                    url={service.cta?.url ?? '#'}
                    onChange={(next) => updateItem(i, { cta: next })}
                  >
                    <span className="inline-flex items-center gap-4 text-xl font-bold tracking-[0.2em] uppercase text-white hover:text-white/80 transition-colors cursor-pointer">
                      {service.cta?.label || 'Explore'} <ArrowUpRight className="h-6 w-6" />
                    </span>
                  </EditableLinkTrigger>
                ) : service.cta?.label ? (
                  <a
                    href={service.cta.url}
                    className="inline-flex items-center gap-4 text-xl font-bold tracking-[0.2em] uppercase text-white hover:text-white/80 transition-colors no-underline cursor-pointer"
                  >
                    {service.cta.label} <ArrowUpRight className="h-6 w-6" />
                  </a>
                ) : null}
              </div>
            </div>

            {editable ? (
              <button
                type="button"
                onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                aria-label="Remove"
                className="absolute right-4 top-4 text-xs bg-white text-black p-3 rounded-full opacity-0 group-hover:opacity-100 z-50 transition-opacity"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}

        {editable ? (
          <div className="flex-none snap-center ml-32">
            <AddRow
              label="Add project"
              onClick={() =>
                onChange({
                  items: [...items, { id: `project-${items.length}`, label: 'New project' }],
                })
              }
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

// --- Contact — light, single centered column. Unlike Studio's dark 2-column ink-block, this
// stays on the normal page background — quiet all the way to the bottom of the page. ------------

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
  const cta = content?.cta ?? {}
  return (
    <section
      id="contact"
      className="h-screen w-full flex flex-col justify-center border-t relative overflow-hidden bg-black"
      style={{ borderColor: ink(10) }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.1]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="mx-auto w-full max-w-7xl px-6 text-center lg:px-8 relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Contact headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              style={{ fontFamily: 'var(--lp-heading)' }}
              className="mb-8 text-[12vw] md:text-[10vw] font-black uppercase tracking-tighter leading-none text-white mix-blend-difference"
            />
          ) : (
            <h2
              className="mb-8 text-[12vw] md:text-[10vw] font-black uppercase tracking-tighter leading-none text-white mix-blend-difference"
              style={{ fontFamily: 'var(--lp-heading)' }}
            >
              {content?.headline || "LET'S TALK"}
            </h2>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          {editable ? (
            <CanvasText
              ariaLabel="Contact body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              className="mb-16 max-w-3xl text-2xl sm:text-3xl font-medium leading-relaxed text-white/60"
            />
          ) : content?.body ? (
            <p className="mb-16 max-w-3xl text-2xl sm:text-3xl font-medium leading-relaxed text-white/60">
              {content.body}
            </p>
          ) : null}

          {editable ? (
            <div className="mb-16">
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ cta: next })}
              >
                <span className="inline-flex items-center gap-4 px-12 py-6 text-2xl font-bold uppercase tracking-widest transition-transform hover:scale-110 cursor-pointer text-black bg-white rounded-full">
                  {cta.label || 'Get in Touch'} <ArrowRight className="h-6 w-6" />
                </span>
              </EditableLinkTrigger>
            </div>
          ) : cta.label ? (
            <div className="mb-16">
              <a
                href={cta.url}
                className="inline-flex items-center gap-4 px-12 py-6 text-2xl font-bold uppercase tracking-widest transition-transform hover:scale-110 cursor-pointer text-black bg-white rounded-full no-underline"
              >
                {cta.label} <ArrowRight className="h-6 w-6" />
              </a>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="mx-auto w-full max-w-md text-left bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl"
        >
          {!hasForm ? (
            <p className="text-center text-sm font-medium text-white/50">
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <div className="text-white">
              <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              <button
                type="button"
                disabled
                className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest text-black bg-white rounded-full transition-colors hover:bg-white/90"
              >
                {submitLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export function Portfolio({
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
      className="min-h-screen antialiased"
      style={{
        backgroundColor: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        color: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        fontFamily: t.fontFamily ?? TOKEN_DEFAULTS.fontFamily,
        ['--lp-primary' as string]: t.primaryColor ?? TOKEN_DEFAULTS.primaryColor,
        ['--lp-on-primary' as string]: t.onPrimaryColor ?? TOKEN_DEFAULTS.onPrimaryColor,
        ['--lp-bg' as string]: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        ['--lp-ink' as string]: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        ['--lp-card' as string]: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
        ['--lp-heading' as string]: t.headingFont ?? TOKEN_DEFAULTS.headingFont,
        ['--lp-radius' as string]: t.radius ?? TOKEN_DEFAULTS.radius,
      }}
    >
      <NavBar content={c.nav} editable={editable} onChange={(patch) => slotChange('nav', patch)} />
      <HeroSection
        content={c.hero}
        editable={editable}
        onChange={(patch) => slotChange('hero', patch)}
      />
      {!isHidden('services') && (
        <ServiceSelectorSection
          content={c.services}
          editable={editable}
          onChange={(patch) => slotChange('services', patch)}
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
    </div>
  )
}
