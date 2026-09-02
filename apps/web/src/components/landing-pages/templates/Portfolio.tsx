import { useState } from 'react'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  ServiceItem,
  FeatureItem,
  TeamMemberItem,
  LogoItem,
  TestimonialItem,
  NavLink,
} from '../../../pages/landing-pages/components/types'

// Same token vocabulary/fallbacks as every other rich template. Portfolio's own register — quiet,
// visual-first, editorial — comes entirely from type weight/scale, generous whitespace, and large
// unadorned imagery, never from hardcoded colors, so any theme still recolors this correctly.
const TOKEN_DEFAULTS = {
  primaryColor: '#0B3D91',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#E8EEF4',
  inkColor: '#122033',
  cardColor: '#FFFFFF',
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: '"IBM Plex Serif", Georgia, serif',
}

const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`
const inv = (mix: number) => `color-mix(in srgb, var(--lp-bg) ${mix}%, var(--lp-ink))`

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

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em]"
      style={{ color: ink(50) }}
    >
      {children}
    </p>
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

// --- Hero — image-dominant, not headline-dominant: a huge full-bleed frame opens the page, and
// the copy sits quietly below it in a narrow centered column, the opposite of a "banner" hero. ---

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  return (
    <section>
      {editable ? (
        <MediaSlotField
          kind="IMAGE"
          urlMode
          fallbackUrl={media.url}
          onUrlChange={(url) => onChange({ media: { ...media, url } })}
        />
      ) : media.url ? (
        <img
          src={media.url}
          alt={media.alt || ''}
          className="h-[55vh] w-full object-cover sm:h-[70vh] lg:h-[80vh]"
        />
      ) : (
        <div
          className="h-[55vh] w-full sm:h-[70vh] lg:h-[80vh]"
          style={{ backgroundColor: ink(6) }}
        />
      )}

      <div className="mx-auto max-w-2xl px-6 py-16 text-center lg:px-8 lg:py-24">
        {editable ? (
          <CanvasText
            ariaLabel="Hero eyebrow"
            value={content?.eyebrow ?? ''}
            onChange={(eyebrow) => onChange({ eyebrow })}
            placeholder="Eyebrow"
            className="mx-auto mb-5 block w-fit text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          />
        ) : content?.eyebrow ? (
          <p
            className="mb-5 text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          >
            {content.eyebrow}
          </p>
        ) : null}

        {editable ? (
          <CanvasText
            as="h1"
            ariaLabel="Hero headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            placeholder="Headline"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mx-auto mb-5 text-center text-4xl font-medium leading-tight sm:text-5xl"
          />
        ) : (
          <h1
            className="mb-5 text-4xl font-medium leading-tight sm:text-5xl"
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
            placeholder="A short line about the work."
            style={{ color: ink(65) }}
            className="mx-auto mb-7 leading-relaxed"
          />
        ) : content?.body ? (
          <p className="mb-7 leading-relaxed" style={{ color: ink(65) }}>
            {content.body}
          </p>
        ) : null}

        {editable ? (
          <EditableLinkTrigger
            label={cta.label ?? ''}
            url={cta.url ?? '#contact'}
            onChange={(next) => onChange({ primaryCta: next })}
          >
            <span
              className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
              style={{ color: 'var(--lp-ink)' }}
            >
              {cta.label || 'Add a call to action'} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </EditableLinkTrigger>
        ) : cta.label ? (
          <a
            href={cta.url}
            className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            style={{ color: 'var(--lp-ink)' }}
          >
            {cta.label} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </section>
  )
}

// --- Featured work — a stack of full-width single-column projects: big image on top, quiet
// centered caption below. No side-by-side alternating grid, no numbering. ----------------------

function ServiceSelectorSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<ServiceItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-24 lg:py-32" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Featured work title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Featured work"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-16 text-center text-3xl font-medium sm:text-4xl"
          />
        ) : (
          <h2
            className="mb-16 text-center text-3xl font-medium sm:text-4xl"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.title}
          </h2>
        )}

        <div className="space-y-28">
          {items.map((service, i) => (
            <div key={i} className="group relative">
              {editable ? (
                <MediaSlotField
                  kind="IMAGE"
                  urlMode
                  fallbackUrl={service.media?.url}
                  onUrlChange={(url) => updateItem(i, { media: { ...service.media, url } })}
                />
              ) : service.media?.url ? (
                <img
                  src={service.media.url}
                  alt={service.media.alt ?? ''}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/10] w-full" style={{ backgroundColor: ink(6) }} />
              )}

              <div className="mx-auto mt-8 max-w-2xl text-center">
                {editable ? (
                  <CanvasText
                    ariaLabel={`Project ${i + 1} label`}
                    value={service.label}
                    onChange={(label) => updateItem(i, { label })}
                    className="mx-auto mb-3 block w-fit text-[11px] font-medium uppercase tracking-[0.3em]"
                    style={{ color: ink(50) }}
                  />
                ) : (
                  <Kicker>{service.label}</Kicker>
                )}
                {editable ? (
                  <CanvasText
                    as="h3"
                    ariaLabel={`Project ${i + 1} headline`}
                    value={service.headline ?? ''}
                    onChange={(headline) => updateItem(i, { headline })}
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                    className="mb-3 text-2xl font-medium"
                  />
                ) : (
                  <h3
                    className="mb-3 text-2xl font-medium"
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  >
                    {service.headline}
                  </h3>
                )}
                {editable ? (
                  <CanvasText
                    ariaLabel={`Project ${i + 1} description`}
                    value={service.description ?? ''}
                    onChange={(description) => updateItem(i, { description })}
                    multiline
                    style={{ color: ink(65) }}
                    className="mb-4 leading-relaxed"
                  />
                ) : service.description ? (
                  <p className="mb-4 leading-relaxed" style={{ color: ink(65) }}>
                    {service.description}
                  </p>
                ) : null}
                {editable ? (
                  <EditableLinkTrigger
                    label={service.cta?.label ?? ''}
                    url={service.cta?.url ?? '#'}
                    onChange={(next) => updateItem(i, { cta: next })}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      {service.cta?.label || 'Add a link'} <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </EditableLinkTrigger>
                ) : service.cta?.label ? (
                  <a
                    href={service.cta.url}
                    className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
                    style={{ color: 'var(--lp-ink)' }}
                  >
                    {service.cta.label} <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>

              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editable ? (
          <div className="text-center">
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

// --- Services — a restrained, quiet 3-column list. No numbering (that's Studio's signature move),
// no card chrome, just centered title + body. --------------------------------------------------

function FeatureListSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<FeatureItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-24" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-xl text-center">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Services headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="mx-auto mb-3 text-3xl font-medium sm:text-4xl"
              />
              <CanvasText
                ariaLabel="Services body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(65) }}
                className="mx-auto leading-relaxed"
              />
            </>
          ) : (
            <>
              <h2
                className="mb-3 text-3xl font-medium sm:text-4xl"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              {content?.body ? (
                <p className="leading-relaxed" style={{ color: ink(65) }}>
                  {content.body}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {items.map((feature, i) => (
            <div key={i} className="group relative text-center">
              {editable ? (
                <>
                  <CanvasText
                    as="h3"
                    ariaLabel={`Service ${i + 1} title`}
                    value={feature.title}
                    onChange={(title) => updateItem(i, { title })}
                    style={{ color: 'var(--lp-ink)' }}
                    className="mx-auto mb-2 block w-fit text-base font-medium"
                  />
                  <CanvasText
                    ariaLabel={`Service ${i + 1} body`}
                    value={feature.body}
                    onChange={(body) => updateItem(i, { body })}
                    multiline
                    style={{ color: ink(65) }}
                    className="mx-auto text-sm leading-relaxed"
                  />
                </>
              ) : (
                <>
                  <h3 className="mb-2 text-base font-medium" style={{ color: 'var(--lp-ink)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: ink(65) }}>
                    {feature.body}
                  </p>
                </>
              )}
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute right-2 top-0 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editable ? (
          <div className="text-center">
            <AddRow
              label="Add service"
              onClick={() => onChange({ items: [...items, { title: 'New service', body: '' }] })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

// --- About — centered, narrow column. One portrait per person, stacked when there's more than
// one — never forced into a multi-column grid (that's Studio's job). ----------------------------

function TeamSection({ content, editable, onChange }: SectionProps<'team'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<TeamMemberItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-24" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        {editable ? (
          <>
            <CanvasText
              as="h2"
              ariaLabel="About headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              className="mx-auto mb-3 text-3xl font-medium sm:text-4xl"
            />
            <CanvasText
              ariaLabel="About body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              style={{ color: ink(65) }}
              className="mx-auto mb-16 max-w-md leading-relaxed"
            />
          </>
        ) : (
          <>
            <h2
              className="mb-3 text-3xl font-medium sm:text-4xl"
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            >
              {content?.headline}
            </h2>
            {content?.body ? (
              <p className="mx-auto mb-16 max-w-md leading-relaxed" style={{ color: ink(65) }}>
                {content.body}
              </p>
            ) : null}
          </>
        )}

        <div className="space-y-16">
          {items.map((member, i) => (
            <div key={i} className="group relative mx-auto max-w-sm">
              {editable ? (
                <div className="mx-auto mb-5 h-40 w-40 overflow-hidden rounded-full">
                  <MediaSlotField
                    kind="IMAGE"
                    urlMode
                    fill
                    fallbackUrl={member.media?.url}
                    onUrlChange={(url) => updateItem(i, { media: { ...member.media, url } })}
                  />
                </div>
              ) : member.media?.url ? (
                <img
                  src={member.media.url}
                  alt={member.media.alt ?? member.name}
                  className="mx-auto mb-5 h-40 w-40 rounded-full object-cover"
                />
              ) : (
                <div
                  className="mx-auto mb-5 h-40 w-40 rounded-full"
                  style={{ backgroundColor: ink(6) }}
                />
              )}
              {editable ? (
                <CanvasText
                  as="h3"
                  ariaLabel={`Person ${i + 1} name`}
                  value={member.name}
                  onChange={(name) => updateItem(i, { name })}
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  className="mx-auto mb-1 block w-fit text-xl font-medium"
                />
              ) : (
                <h3
                  className="mb-1 text-xl font-medium"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                >
                  {member.name}
                </h3>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Person ${i + 1} role`}
                  value={member.role ?? ''}
                  onChange={(role) => updateItem(i, { role })}
                  className="mx-auto mb-4 block w-fit text-sm"
                  style={{ color: ink(55) }}
                />
              ) : member.role ? (
                <p className="mb-4 text-sm" style={{ color: ink(55) }}>
                  {member.role}
                </p>
              ) : null}
              {editable ? (
                <CanvasText
                  ariaLabel={`Person ${i + 1} bio`}
                  value={member.bio ?? ''}
                  onChange={(bio) => updateItem(i, { bio })}
                  multiline
                  className="mx-auto text-sm leading-relaxed"
                  style={{ color: ink(65) }}
                />
              ) : member.bio ? (
                <p className="text-sm leading-relaxed" style={{ color: ink(65) }}>
                  {member.bio}
                </p>
              ) : null}
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editable ? (
          <AddRow
            label="Add person"
            onClick={() => onChange({ items: [...items, { name: 'New person' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Clients — a quiet, static wrapped row of names. No marquee — too loud for this register. ---

function LogoCloudSection({ content, editable, onChange }: SectionProps<'logos'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<LogoItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-20" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Clients title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Featured in"
            className="mx-auto mb-8 block w-fit text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          />
        ) : content?.title ? (
          <p
            className="mb-8 text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          >
            {content.title}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {items.map((logo, i) => (
            <div key={i} className="group relative">
              {editable ? (
                <CanvasText
                  ariaLabel={`Client ${i + 1} name`}
                  value={logo.name}
                  onChange={(name) => updateItem(i, { name })}
                  className="text-sm font-medium opacity-70"
                  style={{ color: 'var(--lp-ink)' }}
                />
              ) : (
                <span className="text-sm font-medium opacity-60" style={{ color: 'var(--lp-ink)' }}>
                  {logo.name}
                </span>
              )}
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute -right-3 -top-2 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editable ? (
          <AddRow
            label="Add logo"
            onClick={() => onChange({ items: [...items, { name: 'New client' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Testimonials — quiet, centered, on the normal page background. Never a full-bleed inverted
// block — that register is too loud for this template. ------------------------------------------

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  const [index, setIndex] = useState(0)
  const current = items[Math.min(index, items.length - 1)]

  function updateCurrent(patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === index ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-24" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            className="mx-auto mb-10 block w-fit text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          />
        ) : content?.headline ? (
          <p
            className="mb-10 text-[11px] font-medium uppercase tracking-[0.3em]"
            style={{ color: ink(50) }}
          >
            {content.headline}
          </p>
        ) : null}

        {current ? (
          <>
            {editable ? (
              <CanvasText
                ariaLabel={`Testimonial ${index + 1} quote`}
                value={current.quote}
                onChange={(quote) => updateCurrent({ quote })}
                multiline
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-xl italic leading-relaxed sm:text-2xl"
              />
            ) : (
              <p
                className="text-xl italic leading-relaxed sm:text-2xl"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                &quot;{current.quote}&quot;
              </p>
            )}
            <div className="mt-6 flex items-baseline justify-center gap-2 text-sm">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} author`}
                  value={current.author}
                  onChange={(author) => updateCurrent({ author })}
                  className="font-medium"
                  style={{ color: 'var(--lp-ink)' }}
                />
              ) : (
                <span className="font-medium" style={{ color: 'var(--lp-ink)' }}>
                  {current.author}
                </span>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} role`}
                  value={current.role ?? ''}
                  onChange={(role) => updateCurrent({ role })}
                  style={{ color: ink(55) }}
                />
              ) : current.role ? (
                <span style={{ color: ink(55) }}>{current.role}</span>
              ) : null}
            </div>
          </>
        ) : null}

        {items.length > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => setIndex((index - 1 + items.length) % items.length)}
              style={{ color: ink(45) }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: i === index ? 'var(--lp-ink)' : ink(20) }}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => setIndex((index + 1) % items.length)}
              style={{ color: ink(45) }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            {current ? (
              <button
                type="button"
                onClick={() => {
                  onChange({ items: items.filter((_, idx) => idx !== index) })
                  setIndex((i) => Math.max(0, i - 1))
                }}
                className="text-xs underline underline-offset-4"
                style={{ color: ink(55) }}
              >
                Remove this one
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onChange({ items: [...items, { quote: '', author: 'New client' }] })
                setIndex(items.length)
              }}
              className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
              style={{ color: ink(55) }}
            >
              <Plus className="h-3 w-3" /> Add testimonial
            </button>
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
    <section id="contact" className="border-t py-24" style={{ borderColor: ink(10) }}>
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Contact headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mx-auto mb-3 text-3xl font-medium sm:text-4xl"
          />
        ) : (
          <h2
            className="mb-3 text-3xl font-medium sm:text-4xl"
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
            className="mx-auto mb-10 max-w-md leading-relaxed"
            style={{ color: ink(65) }}
          />
        ) : content?.body ? (
          <p className="mx-auto mb-10 max-w-md leading-relaxed" style={{ color: ink(65) }}>
            {content.body}
          </p>
        ) : null}

        {editable ? (
          <div className="mb-10">
            <EditableLinkTrigger
              label={cta.label ?? ''}
              url={cta.url ?? '#contact'}
              onChange={(next) => onChange({ cta: next })}
            >
              <span
                className="text-sm font-medium underline underline-offset-4"
                style={{ color: 'var(--lp-ink)' }}
              >
                {cta.label || 'Add a call to action'}
              </span>
            </EditableLinkTrigger>
          </div>
        ) : null}

        <div className="mx-auto max-w-sm text-left">
          {!hasForm ? (
            <p className="text-center text-sm" style={{ color: ink(60) }}>
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <>
              <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              <button
                type="button"
                disabled
                className="mx-auto mt-6 flex items-center justify-center gap-2 text-sm font-medium underline underline-offset-4"
                style={{ color: 'var(--lp-ink)' }}
              >
                {submitLabel} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
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
      {!isHidden('features') && (
        <FeatureListSection
          content={c.features}
          editable={editable}
          onChange={(patch) => slotChange('features', patch)}
        />
      )}
      {!isHidden('team') && (
        <TeamSection
          content={c.team}
          editable={editable}
          onChange={(patch) => slotChange('team', patch)}
        />
      )}
      {!isHidden('logos') && (
        <LogoCloudSection
          content={c.logos}
          editable={editable}
          onChange={(patch) => slotChange('logos', patch)}
        />
      )}
      {!isHidden('testimonials') && (
        <TestimonialsSection
          content={c.testimonials}
          editable={editable}
          onChange={(patch) => slotChange('testimonials', patch)}
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
