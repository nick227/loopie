import { ArrowRight, Plus, X } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  ProductItem,
  CategoryItem,
  LogoItem,
  TestimonialItem,
  NavLink,
  CtaRef,
} from '../../../pages/landing-pages/components/types'

// Same token vocabulary/fallbacks as every other rich template — Store's retail energy comes from
// rounder radii, pill-shaped CTAs, and leaning on --lp-primary as a bold block (not just an
// accent), never from hardcoded colors. Any theme still recolors this template correctly.
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
const inv = (mix: number) => `color-mix(in srgb, var(--lp-on-primary) ${mix}%, var(--lp-primary))`

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
      className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: ink(50) }}
    >
      {children}
    </p>
  )
}

// --- Nav — brand + one link, bare, no chrome (matches every other rich template's nav) ---------

function NavBar({ content, editable, onChange }: SectionProps<'nav'>) {
  const brand = content?.brand ?? ''
  const links = content?.links ?? []
  const primary = links[0]

  function updateLink(i: number, patch: Partial<NavLink>) {
    onChange({ links: links.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <header className="border-b" style={{ borderColor: ink(12) }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Brand name"
            value={brand}
            onChange={(next) => onChange({ brand: next })}
            placeholder="Shop name"
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
            url={primary?.url ?? '#shop'}
            onChange={(next) => (links.length ? updateLink(0, next) : onChange({ links: [next] }))}
          >
            <span
              className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
            >
              {primary?.label || 'Add a link'}
            </span>
          </EditableLinkTrigger>
        ) : primary?.label ? (
          <a
            href={primary.url}
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
          >
            {primary.label}
          </a>
        ) : null}
      </div>
    </header>
  )
}

// --- Hero — two-column, badges + headline + copy + pill CTA on the left, tall product image
// on the right. Badges are the one array-of-plain-strings list in this file. ---------------------

function BadgeList({
  badges,
  editable,
  onChange,
}: {
  badges: string[]
  editable: boolean
  onChange: (next: string[]) => void
}) {
  function updateBadge(i: number, value: string) {
    onChange(badges.map((row, idx) => (idx === i ? value : row)))
  }
  function removeBadge(i: number) {
    onChange(badges.filter((_, idx) => idx !== i))
  }

  if (!badges.length && !editable) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {badges.map((badge, i) => (
        <div key={i} className="group relative">
          {editable ? (
            <CanvasText
              ariaLabel={`Badge ${i + 1}`}
              value={badge}
              onChange={(next) => updateBadge(i, next)}
              placeholder="Badge"
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold w-auto"
              style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
            />
          ) : (
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
            >
              {badge}
            </span>
          )}
          {editable ? (
            <button
              type="button"
              onClick={() => removeBadge(i)}
              aria-label={`Remove badge ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white group-hover:flex"
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      {editable ? (
        <button
          type="button"
          onClick={() => onChange([...badges, 'New badge'])}
          className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium"
          style={{ borderColor: ink(30), color: ink(60) }}
        >
          <Plus className="h-3 w-3" /> Add badge
        </button>
      ) : null}
    </div>
  )
}

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta: CtaRef = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  const badges = content?.badges ?? []

  return (
    <section className="pt-16 pb-20 lg:pt-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <BadgeList
              badges={badges}
              editable={editable}
              onChange={(next) => onChange({ badges: next })}
            />
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
              />
            ) : (
              <h1
                className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
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
                placeholder="Tell shoppers what makes this worth a look."
                style={{ color: ink(70) }}
                className="mt-5 max-w-md text-lg leading-relaxed"
              />
            ) : (
              <p className="mt-5 max-w-md text-lg leading-relaxed" style={{ color: ink(70) }}>
                {content?.body}
              </p>
            )}

            <div className="mt-8">
              {editable ? (
                <EditableLinkTrigger
                  label={cta.label ?? ''}
                  url={cta.url ?? '#shop'}
                  onChange={(next) => onChange({ primaryCta: next })}
                >
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
                    style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
                  >
                    {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
                  </span>
                </EditableLinkTrigger>
              ) : cta.label ? (
                <a
                  href={cta.url}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
                  style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
                >
                  {cta.label} <ArrowRight className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div>
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
                className="aspect-[4/5] w-full rounded-3xl object-cover"
              />
            ) : (
              <div
                className="aspect-[4/5] w-full rounded-3xl"
                style={{ backgroundColor: ink(6) }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Featured Products — 4-up grid of product cards, badge pill overlay, name/price/CTA ---------

function ProductsSection({ content, editable, onChange }: SectionProps<'products'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<ProductItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section id="products" className="py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10 max-w-xl">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Products headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Featured this week"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-3xl font-bold tracking-tight sm:text-4xl mb-3"
              />
              <CanvasText
                ariaLabel="Products body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                placeholder="A few of our favorites, restocked weekly."
                style={{ color: ink(65) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl mb-3"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              {content?.body ? (
                <p className="text-lg" style={{ color: ink(65) }}>
                  {content.body}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product, i) => (
            <div key={i} className="group relative">
              <div className="relative">
                {editable ? (
                  <MediaSlotField
                    kind="IMAGE"
                    urlMode
                    fallbackUrl={product.media?.url}
                    onUrlChange={(url) => updateItem(i, { media: { ...product.media, url } })}
                  />
                ) : product.media?.url ? (
                  <img
                    src={product.media.url}
                    alt={product.media.alt ?? product.name}
                    className="aspect-[4/5] w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="aspect-[4/5] w-full rounded-2xl"
                    style={{ backgroundColor: ink(6) }}
                  />
                )}

                {editable ? (
                  <div className="absolute left-3 top-3">
                    <CanvasText
                      ariaLabel={`Product ${i + 1} badge`}
                      value={product.badge ?? ''}
                      onChange={(badge) => updateItem(i, { badge })}
                      placeholder="Badge"
                      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold w-auto"
                      style={{
                        backgroundColor: 'var(--lp-primary)',
                        color: 'var(--lp-on-primary)',
                      }}
                    />
                  </div>
                ) : product.badge ? (
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
                  >
                    {product.badge}
                  </span>
                ) : null}

                {editable ? (
                  <button
                    type="button"
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    aria-label={`Remove product ${i + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="mt-3">
                {editable ? (
                  <>
                    <CanvasText
                      as="h3"
                      ariaLabel={`Product ${i + 1} name`}
                      value={product.name}
                      onChange={(name) => updateItem(i, { name })}
                      className="text-base font-semibold"
                      style={{ color: 'var(--lp-ink)' }}
                    />
                    <CanvasText
                      ariaLabel={`Product ${i + 1} price`}
                      value={product.price ?? ''}
                      onChange={(price) => updateItem(i, { price })}
                      placeholder="$0.00"
                      className="mt-1 text-sm font-bold"
                      style={{ color: 'var(--lp-ink)' }}
                    />
                    <div className="mt-3">
                      <EditableLinkTrigger
                        label={product.cta?.label ?? ''}
                        url={product.cta?.url ?? '#'}
                        onChange={(next) => updateItem(i, { cta: next })}
                      >
                        <span
                          className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: 'var(--lp-primary)',
                            color: 'var(--lp-on-primary)',
                          }}
                        >
                          {product.cta?.label || 'Shop now'}
                        </span>
                      </EditableLinkTrigger>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--lp-ink)' }}>
                      {product.name}
                    </h3>
                    {product.price ? (
                      <p className="mt-1 text-sm font-bold" style={{ color: 'var(--lp-ink)' }}>
                        {product.price}
                      </p>
                    ) : null}
                    {product.cta?.label ? (
                      <a
                        href={product.cta.url}
                        className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--lp-primary)',
                          color: 'var(--lp-on-primary)',
                        }}
                      >
                        {product.cta.label}
                      </a>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {editable ? (
          <AddRow
            label="Add product"
            onClick={() =>
              onChange({
                items: [...items, { id: `product-${items.length}`, name: 'New product' }],
              })
            }
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Shop by category — square image tiles, caption+link edited together via EditableLinkTrigger

function CategoriesSection({ content, editable, onChange }: SectionProps<'categories'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<CategoryItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-20" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Categories headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            placeholder="Shop by category"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          />
        ) : (
          <h2
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((category, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl">
              {editable ? (
                <MediaSlotField
                  kind="IMAGE"
                  fill
                  urlMode
                  fallbackUrl={category.media?.url}
                  onUrlChange={(url) => updateItem(i, { media: { ...category.media, url } })}
                />
              ) : category.media?.url ? (
                <img
                  src={category.media.url}
                  alt={category.media.alt ?? category.label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: ink(10) }} />
              )}

              {editable ? (
                <EditableLinkTrigger
                  label={category.label}
                  url={category.url ?? '#'}
                  onChange={(next) => updateItem(i, { label: next.label, url: next.url })}
                  className="absolute inset-x-0 bottom-0 z-10"
                >
                  <span className="block bg-gradient-to-t from-black/60 to-transparent p-4 text-left text-base font-bold text-white">
                    {category.label || 'Category name'}
                  </span>
                </EditableLinkTrigger>
              ) : (
                <a
                  href={category.url ?? '#'}
                  className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4 text-base font-bold text-white"
                >
                  {category.label}
                </a>
              )}

              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label={`Remove category ${i + 1}`}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {editable ? (
          <AddRow
            label="Add category"
            onClick={() => onChange({ items: [...items, { label: 'New category' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Brand Story — warm, narrative "why us" moment, image one side + copy the other -------------

function IntroSection({ content, editable, onChange }: SectionProps<'intro'>) {
  const media = content?.media ?? {}

  return (
    <section className="py-20" style={{ backgroundColor: ink(4) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
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
                className="aspect-[4/3] w-full rounded-3xl object-cover"
              />
            ) : (
              <div
                className="aspect-[4/3] w-full rounded-3xl"
                style={{ backgroundColor: ink(8) }}
              />
            )}
          </div>
          <div className="order-1 lg:order-2">
            {editable ? (
              <>
                <CanvasText
                  as="h2"
                  ariaLabel="Brand story headline"
                  value={content?.headline ?? ''}
                  onChange={(headline) => onChange({ headline })}
                  placeholder="Why we started this"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
                />
                <CanvasText
                  ariaLabel="Brand story body"
                  value={content?.body ?? ''}
                  onChange={(body) => onChange({ body })}
                  multiline
                  placeholder="A short story about the people and craft behind this shop."
                  style={{ color: ink(70) }}
                  className="max-w-md text-lg leading-relaxed"
                />
              </>
            ) : (
              <>
                <h2
                  className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                >
                  {content?.headline}
                </h2>
                <p className="max-w-md text-lg leading-relaxed" style={{ color: ink(70) }}>
                  {content?.body}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// --- As seen in — slow marquee on the live page, plain wrapped list while editing, carried over
// from Studio essentially unchanged since a moving press-logo row reads well for a retail brand --

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

  if (!items.length && !editable) return null

  return (
    <section className="border-t py-16" style={{ borderColor: ink(12) }}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Logos title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="As seen in..."
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
            onClick={() => onChange({ items: [...items, { name: 'New press mention' }] })}
          />
        </div>
      ) : items.length ? (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="lp-store-marquee flex w-max items-center gap-16 py-1">
            {track}
            {track}
          </div>
        </div>
      ) : null}
    </section>
  )
}

// --- Testimonials — static grid of cards (unlike Studio's paged pull-quote carousel) ------------

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            placeholder="Loved by customers"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          />
        ) : content?.headline ? (
          <h2
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content.headline}
          </h2>
        ) : null}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((testimonial, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-6"
              style={{ backgroundColor: 'var(--lp-card)' }}
            >
              {editable ? (
                <>
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} quote`}
                    value={testimonial.quote}
                    onChange={(quote) => updateItem(i, { quote })}
                    multiline
                    placeholder="What they said"
                    className="text-sm leading-relaxed"
                    style={{ color: ink(75) }}
                  />
                  <div className="mt-4">
                    <CanvasText
                      ariaLabel={`Testimonial ${i + 1} author`}
                      value={testimonial.author}
                      onChange={(author) => updateItem(i, { author })}
                      className="text-sm font-semibold"
                      style={{ color: 'var(--lp-ink)' }}
                    />
                    <CanvasText
                      ariaLabel={`Testimonial ${i + 1} role`}
                      value={testimonial.role ?? ''}
                      onChange={(role) => updateItem(i, { role })}
                      placeholder="Role (optional)"
                      className="text-xs"
                      style={{ color: ink(55) }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    aria-label={`Remove testimonial ${i + 1}`}
                    className="absolute right-3 top-3 text-xs opacity-0 group-hover:opacity-100"
                    style={{ color: ink(45) }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed" style={{ color: ink(75) }}>
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="mt-4 text-sm">
                    <span className="font-semibold" style={{ color: 'var(--lp-ink)' }}>
                      {testimonial.author}
                    </span>
                    {testimonial.role ? (
                      <span style={{ color: ink(55) }}> · {testimonial.role}</span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {editable ? (
          <AddRow
            label="Add testimonial"
            onClick={() => onChange({ items: [...items, { quote: '', author: 'New customer' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

// --- Closing promo strip — bold, compact, inverted-palette email-capture bar --------------------

function PromoFooterSection({
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
  const cta: CtaRef = content?.cta ?? {}

  return (
    <section
      id="contact"
      className="py-14"
      style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 lg:grid-cols-2 lg:px-8">
        <div>
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Promo headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              placeholder="Get 10% off your first order"
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-3"
            />
          ) : (
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">
              {content?.headline}
            </h2>
          )}
          {editable ? (
            <CanvasText
              ariaLabel="Promo body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              placeholder="Join the list for early drops and restocks."
              style={{ color: inv(85) }}
              className="max-w-sm text-base"
            />
          ) : (
            <p className="max-w-sm text-base" style={{ color: inv(85) }}>
              {content?.body}
            </p>
          )}
          <div className="mt-6">
            {editable ? (
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ cta: next })}
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                  style={{ backgroundColor: 'var(--lp-on-primary)', color: 'var(--lp-primary)' }}
                >
                  {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
                </span>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <a
                href={cta.url}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                style={{ backgroundColor: 'var(--lp-on-primary)', color: 'var(--lp-primary)' }}
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          {!hasForm ? (
            <p className="text-sm" style={{ color: inv(70) }}>
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <div className="rounded-2xl p-5" style={{ backgroundColor: inv(12) }}>
              <div className="[&_label]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_80%,var(--lp-primary))] [&_input]:!rounded-full [&_input]:!border-0 [&_input]:!bg-[color:var(--lp-on-primary)] [&_input]:!px-4 [&_input]:!py-2 [&_input]:!text-[color:var(--lp-primary)] [&_select]:!rounded-full [&_select]:!border-0 [&_select]:!bg-[color:var(--lp-on-primary)] [&_select]:!px-4 [&_select]:!text-[color:var(--lp-primary)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_65%,var(--lp-primary))] [&_button]:!text-[color:var(--lp-on-primary)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-on-primary)_25%,var(--lp-primary))]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: 'var(--lp-on-primary)', color: 'var(--lp-primary)' }}
              >
                {submitLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function Store({
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
        @keyframes lp-store-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lp-store-marquee { animation: lp-store-marquee 28s linear infinite; }
      `}</style>
      <NavBar content={c.nav} editable={editable} onChange={(patch) => slotChange('nav', patch)} />
      <HeroSection
        content={c.hero}
        editable={editable}
        onChange={(patch) => slotChange('hero', patch)}
      />
      {!isHidden('products') && (
        <ProductsSection
          content={c.products}
          editable={editable}
          onChange={(patch) => slotChange('products', patch)}
        />
      )}
      {!isHidden('categories') && (
        <CategoriesSection
          content={c.categories}
          editable={editable}
          onChange={(patch) => slotChange('categories', patch)}
        />
      )}
      {!isHidden('intro') && (
        <IntroSection
          content={c.intro}
          editable={editable}
          onChange={(patch) => slotChange('intro', patch)}
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
      <PromoFooterSection
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
