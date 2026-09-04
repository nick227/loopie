import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useAsset } from '@project/sdk'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { GalleryAddButton } from '../../../pages/landing-pages/components/editable/GalleryAddButton'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { mediaSrc } from '@/lib/media'
import type {
  PageContent,
  ServiceItem,
  TestimonialItem,
  FaqItem,
  LogoItem,
  MetricItem,
  FeatureItem,
  GalleryItem,
  TeamMemberItem,
  NavLink,
} from '../../../pages/landing-pages/components/types'

// Same token vocabulary/fallbacks as every other template — the bold, editorial *feel* here comes
// entirely from type scale, asymmetry, and the deliberate absence of card chrome (no rounded
// corners, no shadows, hairline rules only), never from hardcoded colors. Any theme still recolors
// this template correctly.
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
      className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: ink(50) }}
    >
      {children}
    </p>
  )
}

// --- Nav — deliberately bare: wordmark + one link, no backdrop, no chrome ------------------

function NavBar({ content, editable, onChange }: SectionProps<'nav'>) {
  const brand = content?.brand ?? ''
  const links = content?.links ?? []
  const primary = links[0]

  function updateLink(i: number, patch: Partial<NavLink>) {
    onChange({ links: links.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <header className="border-b" style={{ borderColor: ink(12) }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Brand name"
            value={brand}
            onChange={(next) => onChange({ brand: next })}
            placeholder="Studio name"
            style={{ color: 'var(--lp-ink)' }}
            className="text-lg font-bold tracking-tight w-auto"
          />
        ) : (
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--lp-ink)' }}>
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
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: 'var(--lp-ink)' }}
            >
              {primary?.label || 'Add a link'}
            </span>
          </EditableLinkTrigger>
        ) : primary?.label ? (
          <a
            href={primary.url}
            className="text-sm font-semibold underline underline-offset-4"
            style={{ color: 'var(--lp-ink)' }}
          >
            {primary.label}
          </a>
        ) : null}
      </div>
    </header>
  )
}

// --- Hero — asymmetric: headline dominates a wide column, meta sits in a narrow rail beside it,
// never below it. The published image is deliberately offset (not full-bleed centered) so the
// page opens with real negative space instead of a stock "banner" shape. ------------------------

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  return (
    <section className="pt-20 pb-0 lg:pt-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-6xl font-extrabold leading-[0.96] tracking-tight sm:text-7xl lg:text-[6.5rem]"
              />
            ) : (
              <h1
                className="text-6xl font-extrabold leading-[0.96] tracking-tight sm:text-7xl lg:text-[6.5rem]"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h1>
            )}
          </div>
          <div
            className="flex flex-col gap-6 border-t pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            style={{ borderColor: ink(15) }}
          >
            {editable ? (
              <CanvasText
                ariaLabel="Hero body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                placeholder="Subheadline"
                style={{ color: ink(70) }}
                className="leading-relaxed"
              />
            ) : (
              <p className="leading-relaxed" style={{ color: ink(70) }}>
                {content?.body}
              </p>
            )}

            {editable ? (
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ primaryCta: next })}
              >
                <span
                  className="inline-flex items-center gap-2 text-base font-semibold underline underline-offset-4"
                  style={{ color: 'var(--lp-ink)' }}
                >
                  {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
                </span>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <a
                href={cta.url}
                className="inline-flex items-center gap-2 text-base font-semibold underline underline-offset-4"
                style={{ color: 'var(--lp-ink)' }}
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-16 flex justify-end">
        {editable ? (
          <div className="aspect-[3/4] w-full max-w-lg overflow-hidden lg:max-w-xl">
            <MediaSlotField
              kind="IMAGE"
              urlMode
              fallbackUrl={media.url}
              onUrlChange={(url) => onChange({ media: { ...media, url } })}
            />
          </div>
        ) : media.url ? (
          <img
            src={media.url}
            alt={media.alt || ''}
            className="aspect-[3/4] w-full max-w-lg object-cover lg:max-w-xl"
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Logo wall — a slow marquee on the live page (movement, not another static row), a plain
// wrapped list while editing so nothing is fighting the cursor. ----------------------------------

function LogoCloudSection({ content, editable, onChange }: SectionProps<'logos'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<LogoItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  const track = (
    <>
      {items.map((logo, i) => (
        <span
          key={i}
          className="shrink-0 text-xl font-semibold tracking-tight opacity-60"
          style={{ color: 'var(--lp-ink)' }}
        >
          {logo.name}
        </span>
      ))}
    </>
  )
  return (
    <section className="border-t py-16" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Logos title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Trusted by..."
            className="mb-8 text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: ink(50) }}
          />
        ) : (
          <Kicker>{content?.title}</Kicker>
        )}
      </div>

      {editable ? (
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
            {items.map((logo, i) => (
              <div key={i} className="group relative">
                <CanvasText
                  ariaLabel={`Logo ${i + 1} name`}
                  value={logo.name}
                  onChange={(name) => updateItem(i, { name })}
                  className="text-xl font-semibold tracking-tight opacity-70"
                  style={{ color: 'var(--lp-ink)' }}
                />
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute -right-3 -top-2 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <AddRow
            label="Add logo"
            onClick={() => onChange({ items: [...items, { name: 'New client' }] })}
          />
        </div>
      ) : items.length ? (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="lp-studio-marquee flex w-max items-center gap-16 py-1">
            {track}
            {track}
          </div>
        </div>
      ) : null}
    </section>
  )
}

// --- Metrics — huge numerals, hairline dividers ----------------------------------------------

function MetricsSection({ content, editable, onChange }: SectionProps<'metrics'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<MetricItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-20" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div
          className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          style={{ borderColor: ink(12) }}
        >
          {items.map((metric, i) => (
            <div
              key={i}
              className="group relative px-0 py-6 first:pt-0 sm:px-10 sm:py-0 sm:first:pl-0"
            >
              {editable ? (
                <>
                  <CanvasText
                    ariaLabel={`Metric ${i + 1} value`}
                    value={metric.value}
                    onChange={(value) => updateItem(i, { value })}
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                    className="text-6xl font-extrabold tracking-tight"
                  />
                  <CanvasText
                    ariaLabel={`Metric ${i + 1} label`}
                    value={metric.label}
                    onChange={(label) => updateItem(i, { label })}
                    className="mt-2 text-sm"
                    style={{ color: ink(60) }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    aria-label="Remove"
                    className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
                    style={{ color: ink(45) }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="text-6xl font-extrabold tracking-tight"
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  >
                    {metric.value}
                  </div>
                  <p className="mt-2 text-sm" style={{ color: ink(60) }}>
                    {metric.label}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add stat"
            onClick={() => onChange({ items: [...items, { value: '0', label: 'New stat' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Capabilities — numbered editorial list, no icon chips -----------------------------------

function FeatureListSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<FeatureItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-24" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-14 max-w-xl">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Features headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-4xl font-bold tracking-tight sm:text-5xl mb-3"
              />
              <CanvasText
                ariaLabel="Features body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(65) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-4xl font-bold tracking-tight sm:text-5xl mb-3"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(65) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: ink(12) }}>
          {items.map((feature, i) => (
            <div
              key={i}
              className="group relative grid grid-cols-1 gap-3 py-8 sm:grid-cols-[7rem_1fr] sm:gap-8"
            >
              <span
                className="text-4xl font-bold tabular-nums"
                style={{ fontFamily: 'var(--lp-heading)', color: ink(28) }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="max-w-xl">
                {editable ? (
                  <>
                    <CanvasText
                      as="h3"
                      ariaLabel={`Feature ${i + 1} title`}
                      value={feature.title}
                      onChange={(title) => updateItem(i, { title })}
                      style={{ color: 'var(--lp-ink)' }}
                      className="text-xl font-semibold mb-2"
                    />
                    <CanvasText
                      ariaLabel={`Feature ${i + 1} body`}
                      value={feature.body}
                      onChange={(body) => updateItem(i, { body })}
                      multiline
                      style={{ color: ink(65) }}
                      className="leading-relaxed"
                    />
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--lp-ink)' }}>
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed" style={{ color: ink(65) }}>
                      {feature.body}
                    </p>
                  </>
                )}
              </div>
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute right-0 top-8 text-xs opacity-0 group-hover:opacity-100"
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
            label="Add step"
            onClick={() => onChange({ items: [...items, { title: 'New step', body: '' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Selected work — large dominant images, editorial numbering to match Capabilities ----------

function ServiceSelectorSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<ServiceItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-24" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Services title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-14 text-4xl font-bold tracking-tight sm:text-5xl"
          />
        ) : (
          <h2
            className="mb-14 text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.title}
          </h2>
        )}
        <div className="space-y-24">
          {items.map((service, i) => (
            <div
              key={i}
              className={`group relative grid gap-8 lg:grid-cols-12 lg:items-center ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div className="lg:col-span-7">
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
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="lg:col-span-5">
                <span
                  className="mb-4 block text-3xl font-bold tabular-nums"
                  style={{ fontFamily: 'var(--lp-heading)', color: ink(28) }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {editable ? (
                  <CanvasText
                    ariaLabel={`Service ${i + 1} label`}
                    value={service.label}
                    onChange={(label) => updateItem(i, { label })}
                    className="text-[11px] font-semibold uppercase tracking-[0.28em] mb-3"
                    style={{ color: ink(50) }}
                  />
                ) : (
                  <Kicker>{service.label}</Kicker>
                )}
                {editable ? (
                  <CanvasText
                    as="h3"
                    ariaLabel={`Service ${i + 1} headline`}
                    value={service.headline ?? ''}
                    onChange={(headline) => updateItem(i, { headline })}
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                    className="text-2xl font-bold tracking-tight mb-3"
                  />
                ) : (
                  <h3
                    className="text-2xl font-bold tracking-tight mb-3"
                    style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  >
                    {service.headline}
                  </h3>
                )}
                {editable ? (
                  <CanvasText
                    ariaLabel={`Service ${i + 1} description`}
                    value={service.description ?? ''}
                    onChange={(description) => updateItem(i, { description })}
                    multiline
                    style={{ color: ink(65) }}
                    className="leading-relaxed mb-4"
                  />
                ) : (
                  <p className="leading-relaxed mb-4" style={{ color: ink(65) }}>
                    {service.description}
                  </p>
                )}
                {editable ? (
                  <EditableLinkTrigger
                    label={service.cta?.label ?? ''}
                    url={service.cta?.url ?? '#'}
                    onChange={(next) => updateItem(i, { cta: next })}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      {service.cta?.label || 'Add a link'} <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </EditableLinkTrigger>
                ) : service.cta?.label ? (
                  <a
                    href={service.cta.url}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
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
          <AddRow
            label="Add project"
            onClick={() =>
              onChange({
                items: [...items, { id: `project-${items.length}`, label: 'New project' }],
              })
            }
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Photo gallery — masonry wall of studio/work photos, click for a real lightbox --------------

// Gallery items added via the asset picker only carry an `assetId` — resolve it to a real URL the
// same way MediaSlotField does for every other media slot in this app (a single-asset lookup),
// falling back to a raw `.url`/`.src` for starter-content photos that were never uploaded.
function useResolvedGallerySrc(item: GalleryItem | undefined): string | null {
  const assetQuery = useAsset(item?.assetId ?? '')
  if (!item) return null
  if (item.src) return item.src
  if (item.assetId) return assetQuery.data?.data ? mediaSrc(assetQuery.data.data.url) : null
  if (item.url) return mediaSrc(item.url)
  return null
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, onIndex])

  const item = items[index]
  const src = useResolvedGallerySrc(item)
  if (!item) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/92 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 text-white/70 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index - 1 + items.length) % items.length)
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white sm:left-6"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation()
              onIndex((index + 1) % items.length)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white sm:right-6"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      ) : null}
      {src ? (
        <img
          src={src}
          alt={item.alt ?? ''}
          className="max-h-[80vh] max-w-[92vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
      {item.caption ? (
        <p className="max-w-lg text-center text-sm text-white/70">{item.caption}</p>
      ) : null}
    </div>
  )
}

function GalleryTile({
  item,
  editable,
  onOpen,
  onCaptionChange,
  onRemove,
  captionLabel,
}: {
  item: GalleryItem
  editable: boolean
  onOpen: () => void
  onCaptionChange: (caption: string) => void
  onRemove: () => void
  captionLabel: string
}) {
  const src = useResolvedGallerySrc(item)
  return (
    <div className="group relative mb-3 break-inside-avoid">
      {src ? (
        <img
          src={src}
          alt={item.alt ?? ''}
          onClick={() => !editable && onOpen()}
          className={editable ? 'w-full object-cover' : 'w-full cursor-zoom-in object-cover'}
        />
      ) : (
        <div className="aspect-square w-full" style={{ backgroundColor: ink(6) }} />
      )}
      {!editable && item.caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="text-xs text-white">{item.caption}</p>
        </div>
      ) : null}
      {editable ? (
        <>
          <CanvasText
            ariaLabel={captionLabel}
            value={item.caption ?? ''}
            onChange={onCaptionChange}
            placeholder="Caption"
            className="mt-1 text-xs"
            style={{ color: ink(60) }}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
    </div>
  )
}

function GallerySection({ content, editable, onChange }: SectionProps<'gallery'>) {
  const items = content?.items ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  function updateItem(i: number, patch: Partial<GalleryItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-24" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Gallery title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="From the studio floor"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-10 text-4xl font-bold tracking-tight sm:text-5xl"
          />
        ) : (
          <h2
            className="mb-10 text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.title}
          </h2>
        )}

        <div className="columns-2 gap-3 sm:columns-3">
          {items.map((item, i) => (
            <GalleryTile
              key={i}
              item={item}
              editable={editable}
              onOpen={() => setLightboxIndex(i)}
              onCaptionChange={(caption) => updateItem(i, { caption })}
              onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
              captionLabel={`Photo ${i + 1} caption`}
            />
          ))}
        </div>

        {editable ? (
          <GalleryAddButton
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            onAdd={(assetIds) =>
              onChange({ items: [...items, ...assetIds.map((assetId) => ({ assetId }))] })
            }
            label="Add photos"
          />
        ) : null}
      </div>

      {!editable && lightboxIndex !== null ? (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </section>
  )
}

// --- About/Team — plain portrait grid, left-aligned captions, no card chrome -------------------

function TeamSection({ content, editable, onChange }: SectionProps<'team'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<TeamMemberItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-24" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-14 max-w-xl">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Team headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-4xl font-bold tracking-tight sm:text-5xl mb-3"
              />
              <CanvasText
                ariaLabel="Team body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(65) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-4xl font-bold tracking-tight sm:text-5xl mb-3"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(65) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((member, i) => (
            <div key={i} className="group relative">
              {editable ? (
                <MediaSlotField
                  kind="IMAGE"
                  urlMode
                  fallbackUrl={member.media?.url}
                  onUrlChange={(url) => updateItem(i, { media: { ...member.media, url } })}
                />
              ) : member.media?.url ? (
                <img
                  src={member.media.url}
                  alt={member.media.alt ?? member.name}
                  className="mb-4 aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="mb-4 aspect-[3/4] w-full" style={{ backgroundColor: ink(6) }} />
              )}
              {editable ? (
                <CanvasText
                  as="h3"
                  ariaLabel={`Team member ${i + 1} name`}
                  value={member.name}
                  onChange={(name) => updateItem(i, { name })}
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  className="text-lg font-semibold"
                />
              ) : (
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                >
                  {member.name}
                </h3>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Team member ${i + 1} role`}
                  value={member.role ?? ''}
                  onChange={(role) => updateItem(i, { role })}
                  className="mt-0.5 text-sm"
                  style={{ color: ink(60) }}
                />
              ) : member.role ? (
                <p className="mt-0.5 text-sm" style={{ color: ink(60) }}>
                  {member.role}
                </p>
              ) : null}
              {editable ? (
                <CanvasText
                  ariaLabel={`Team member ${i + 1} bio`}
                  value={member.bio ?? ''}
                  onChange={(bio) => updateItem(i, { bio })}
                  multiline
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: ink(65) }}
                />
              ) : member.bio ? (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: ink(65) }}>
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
            onClick={() => onChange({ items: [...items, { name: 'New team member' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Testimonials — one huge pull-quote at a time, paged, not another divided list --------------

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  const [index, setIndex] = useState(0)
  const current = items[Math.min(index, items.length - 1)]

  function updateCurrent(patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === index ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section
      className="border-t py-28"
      style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)', borderColor: inv(15) }}
    >
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            className="mb-12 text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: inv(55) }}
          />
        ) : content?.headline ? (
          <p
            className="mb-12 text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: inv(55) }}
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
                style={{ fontFamily: 'var(--lp-heading)' }}
                className="text-3xl font-medium italic leading-snug sm:text-4xl"
              />
            ) : (
              <p
                className="text-3xl font-medium italic leading-snug sm:text-4xl"
                style={{ fontFamily: 'var(--lp-heading)' }}
              >
                &quot;{current.quote}&quot;
              </p>
            )}
            <div className="mt-8 flex items-baseline justify-center gap-2 text-sm">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} author`}
                  value={current.author}
                  onChange={(author) => updateCurrent({ author })}
                  className="font-semibold"
                />
              ) : (
                <span className="font-semibold">{current.author}</span>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} role`}
                  value={current.role ?? ''}
                  onChange={(role) => updateCurrent({ role })}
                  style={{ color: inv(65) }}
                />
              ) : (
                <span style={{ color: inv(65) }}>{current.role}</span>
              )}
            </div>
          </>
        ) : null}

        {items.length > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => setIndex((index - 1 + items.length) % items.length)}
              style={{ color: inv(60) }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: i === index ? 'var(--lp-bg)' : inv(30) }}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => setIndex((index + 1) % items.length)}
              style={{ color: inv(60) }}
            >
              <ChevronRight className="h-5 w-5" />
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
                style={{ color: inv(55) }}
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
              style={{ color: inv(55) }}
            >
              <Plus className="h-3 w-3" /> Add testimonial
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

// --- FAQ — hairline accordion -------------------------------------------------------------------

function FAQSection({ content, editable, onChange }: SectionProps<'faq'>) {
  const items = content?.items ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  function updateItem(i: number, patch: Partial<FaqItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="border-t py-24" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="FAQ headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-12 text-4xl font-bold tracking-tight"
          />
        ) : (
          <h2
            className="mb-12 text-4xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        <div className="divide-y" style={{ borderColor: ink(12) }}>
          {items.map((faq, i) => (
            <div key={i} className="py-6">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                {editable ? (
                  <CanvasText
                    ariaLabel={`Question ${i + 1}`}
                    value={faq.question}
                    onChange={(question) => updateItem(i, { question })}
                    className="text-lg font-semibold"
                    style={{ color: 'var(--lp-ink)' }}
                  />
                ) : (
                  <span className="text-lg font-semibold" style={{ color: 'var(--lp-ink)' }}>
                    {faq.question}
                  </span>
                )}
                <Plus
                  className={`h-4 w-4 shrink-0 transition-transform ${openIndex === i ? 'rotate-45' : ''}`}
                  style={{ color: ink(45) }}
                />
              </button>
              {openIndex === i ? (
                <div className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: ink(65) }}>
                  {editable ? (
                    <CanvasText
                      ariaLabel={`Answer ${i + 1}`}
                      value={faq.answer}
                      onChange={(answer) => updateItem(i, { answer })}
                      multiline
                    />
                  ) : (
                    faq.answer
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add question"
            onClick={() =>
              onChange({ items: [...items, { question: 'New question', answer: '' }] })
            }
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Contact — full-bleed close, underline-style inline form ----------------------------------

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
      className="border-t py-28"
      style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)', borderColor: inv(15) }}
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div>
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Closing headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              style={{ fontFamily: 'var(--lp-heading)' }}
              className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl mb-5"
            />
          ) : (
            <h2
              className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl mb-5"
              style={{ fontFamily: 'var(--lp-heading)' }}
            >
              {content?.headline}
            </h2>
          )}
          {editable ? (
            <CanvasText
              ariaLabel="Closing body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              style={{ color: inv(70) }}
              className="max-w-sm leading-relaxed"
            />
          ) : (
            <p className="max-w-sm leading-relaxed" style={{ color: inv(70) }}>
              {content?.body}
            </p>
          )}
          {editable ? (
            <div className="mt-6">
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ cta: next })}
              >
                <span className="text-sm font-semibold underline underline-offset-4">
                  {cta.label || 'Add a call to action'}
                </span>
              </EditableLinkTrigger>
            </div>
          ) : null}
        </div>
        <div>
          {!hasForm ? (
            <p className="text-sm" style={{ color: inv(60) }}>
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <>
              <div className="[&_label]:!text-[color:color-mix(in_srgb,var(--lp-bg)_70%,var(--lp-ink))] [&_input]:!rounded-none [&_input]:!border-0 [&_input]:!border-b [&_input]:!border-[color:color-mix(in_srgb,var(--lp-bg)_25%,var(--lp-ink))] [&_input]:!bg-transparent [&_input]:!px-0 [&_input]:!pb-2 [&_input]:!text-[color:var(--lp-bg)] [&_select]:!rounded-none [&_select]:!border-0 [&_select]:!border-b [&_select]:!border-[color:color-mix(in_srgb,var(--lp-bg)_25%,var(--lp-ink))] [&_select]:!bg-transparent [&_select]:!px-0 [&_select]:!text-[color:var(--lp-bg)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-bg)_60%,var(--lp-ink))] [&_button]:!text-[color:var(--lp-bg)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-bg)_25%,var(--lp-ink))]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-6 inline-flex items-center gap-2 text-base font-semibold underline underline-offset-4"
              >
                {submitLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export function Studio({
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
      <style>{`
        @keyframes lp-studio-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lp-studio-marquee { animation: lp-studio-marquee 28s linear infinite; }
      `}</style>
      <NavBar content={c.nav} editable={editable} onChange={(patch) => slotChange('nav', patch)} />
      <HeroSection
        content={c.hero}
        editable={editable}
        onChange={(patch) => slotChange('hero', patch)}
      />
      {!isHidden('logos') && (
        <LogoCloudSection
          content={c.logos}
          editable={editable}
          onChange={(patch) => slotChange('logos', patch)}
        />
      )}
      {!isHidden('metrics') && (
        <MetricsSection
          content={c.metrics}
          editable={editable}
          onChange={(patch) => slotChange('metrics', patch)}
        />
      )}
      {!isHidden('services') && (
        <ServiceSelectorSection
          content={c.services}
          editable={editable}
          onChange={(patch) => slotChange('services', patch)}
        />
      )}
      {!isHidden('gallery') && (
        <GallerySection
          content={c.gallery}
          editable={editable}
          onChange={(patch) => slotChange('gallery', patch)}
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
      {!isHidden('testimonials') && (
        <TestimonialsSection
          content={c.testimonials}
          editable={editable}
          onChange={(patch) => slotChange('testimonials', patch)}
        />
      )}
      {!isHidden('faq') && (
        <FAQSection
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
    </div>
  )
}
