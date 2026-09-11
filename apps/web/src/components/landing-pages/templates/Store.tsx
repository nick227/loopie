import { useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  ProductItem,
  NavLink,
  CtaRef,
} from '../../../pages/landing-pages/components/types'
import type { LayoutVariant } from '../../../pages/landing-pages/components/LayoutVariantPicker'

// Layout (2026-09-11) — Store has no hero at all (its schema goes straight to the product grid),
// so the grid itself and the closing promo strip carry the whole axis. Nothing here is motion —
// purely static Tailwind grid/column classes, so every variant is a plain, low-risk class swap.
const PRODUCT_GRID_CLASS: Record<LayoutVariant, string> = {
  STACKED: 'grid-cols-1 max-w-2xl mx-auto',
  SPLIT: 'grid-cols-2',
  CENTERED: 'grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto',
  ALTERNATING: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  EDITORIAL: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

// Same token vocabulary/fallbacks as every other rich template — Store's retail energy comes from
// rounder radii, pill-shaped CTAs, and leaning on --lp-primary as a bold block (not just an
// accent), never from hardcoded colors. Any theme still recolors this template correctly.
const TOKEN_DEFAULTS = {
  primaryColor: '#FF2D6A',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  inkColor: '#0A0A0A',
  cardColor: '#F5F5F5',
  fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: '"Bricolage Grotesque", Syne, ui-sans-serif, system-ui, sans-serif',
  radius: '8px',
}

const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`
const inv = (mix: number) => `color-mix(in srgb, var(--lp-on-primary) ${mix}%, var(--lp-primary))`

type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
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
              className="inline-flex items-center px-4 py-1.5 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--lp-primary)',
                color: 'var(--lp-on-primary)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {primary?.label || 'Add a link'}
            </span>
          </EditableLinkTrigger>
        ) : primary?.label ? (
          <a
            href={primary.url}
            className="inline-flex items-center px-4 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--lp-primary)',
              color: 'var(--lp-on-primary)',
              borderRadius: 'var(--lp-radius)',
            }}
          >
            {primary.label}
          </a>
        ) : null}
      </div>
    </header>
  )
}

// --- Featured Products — 4-up grid of product cards, badge pill overlay, name/price/CTA ---------

function getFallbackPattern(index: number) {
  const colors = [
    '#f8f9fa', // Lightest gray
    '#f1f3f5', // Light gray
    '#e9ecef', // Medium light gray
    '#dee2e6', // Medium gray
  ]
  return colors[index % colors.length]
}

function ProductsSection({
  content,
  editable,
  onChange,
  layoutVariant = 'ALTERNATING',
}: SectionProps<'products'> & { layoutVariant?: LayoutVariant }) {
  const mockNames = [
    'Meteor Shower Tee',
    'The Power of Reading',
    'Safe Harbor',
    'Worry Later Hoodie',
    'RPG Cats Bookshelf',
    'Aurora Borealis Song II',
    'The King! Vintage Wash',
    'Black Coffee Magic',
    'Put That Suggestion Back',
    'I Fix Problems You Created',
    'Future Me Problem',
    'Snack Time',
  ]
  const mockImages = [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=800',
  ]
  const contentItems = content?.items ?? []
  const items = (
    contentItems.length > 0 ? contentItems : Array.from<ProductItem | undefined>({ length: 20 })
  ).map((rawItem, i) => {
    const item: Partial<ProductItem> = rawItem ?? {}
    return {
      id: item.id || `mock-${i}`,
      name: item.name || mockNames[i % mockNames.length] || `Apparel Item ${i + 1}`,
      price: item.price || `$${(19 + (i % 3) * 5).toFixed(2)}`,
      badge: item.badge !== undefined ? item.badge : i % 5 === 0 ? 'Best Seller' : undefined,
      media: item.media?.url ? item.media : { url: mockImages[i % mockImages.length], alt: '' },
    }
  })

  const [visibleCount, setVisibleCount] = useState(8)

  function updateItem(i: number, patch: Partial<ProductItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  const visibleGridItems = items.slice(0, visibleCount)
  const hasMore = visibleGridItems.length < items.length

  return (
    <section id="products" className="py-12" style={{ backgroundColor: 'var(--lp-bg)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 border-b pb-4" style={{ borderColor: ink(10) }}>
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Products headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              placeholder="Featured this week"
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              className="text-2xl font-black tracking-tight"
            />
          ) : (
            <h2
              className="text-2xl font-black tracking-tight"
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            >
              {content?.headline || 'Store'}
            </h2>
          )}
        </div>

        <div className={`grid gap-4 lg:gap-6 ${PRODUCT_GRID_CLASS[layoutVariant]}`}>
          {visibleGridItems.map((product, i) => (
            <div
              key={i}
              className={`group relative flex flex-col transition-shadow hover:shadow-lg ${
                layoutVariant === 'EDITORIAL' && i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
              } ${layoutVariant === 'ALTERNATING' && i % 2 === 1 ? 'text-right' : ''}`}
              style={{ backgroundColor: 'transparent' }}
            >
              <div
                className="relative aspect-square overflow-hidden mb-3"
                style={{ borderRadius: '6px', backgroundColor: getFallbackPattern(i) }}
              >
                {editable ? (
                  <MediaSlotField
                    kind="IMAGE"
                    urlMode
                    fill
                    fallbackUrl={product.media?.url}
                    onUrlChange={(url) => updateItem(i, { media: { ...product.media, url } })}
                  />
                ) : product.media?.url ? (
                  <img
                    src={product.media.url}
                    alt={product.media.alt ?? product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}

                {editable ? (
                  <div className="absolute left-3 top-3 z-10">
                    <CanvasText
                      ariaLabel={`Product ${i + 1} badge`}
                      value={product.badge ?? ''}
                      onChange={(badge) => updateItem(i, { badge })}
                      placeholder="Badge"
                      className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm w-auto"
                      style={{
                        backgroundColor: 'var(--lp-primary)',
                        color: 'var(--lp-on-primary)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                ) : product.badge ? (
                  <span
                    className="absolute left-3 top-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    style={{
                      backgroundColor: 'var(--lp-primary)',
                      color: 'var(--lp-on-primary)',
                      borderRadius: '4px',
                    }}
                  >
                    {product.badge}
                  </span>
                ) : null}

                {editable ? (
                  <button
                    type="button"
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    aria-label={`Remove product ${i + 1}`}
                    className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col flex-grow px-1">
                {editable ? (
                  <>
                    <CanvasText
                      as="h3"
                      ariaLabel={`Product ${i + 1} name`}
                      value={product.name}
                      onChange={(name) => updateItem(i, { name })}
                      className="text-[15px] font-medium leading-snug"
                      style={{ color: 'var(--lp-ink)' }}
                    />
                    <CanvasText
                      ariaLabel={`Product ${i + 1} price`}
                      value={product.price ?? ''}
                      onChange={(price) => updateItem(i, { price })}
                      placeholder="$0.00"
                      className="mt-1 text-[15px] font-bold"
                      style={{ color: 'var(--lp-ink)' }}
                    />
                  </>
                ) : (
                  <>
                    <h3
                      className="text-[15px] font-medium leading-snug"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      {product.name}
                    </h3>
                    {product.price ? (
                      <p className="mt-1 text-[15px] font-bold" style={{ color: 'var(--lp-ink)' }}>
                        {product.price}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + 8)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90"
              style={{
                backgroundColor: 'var(--lp-primary)',
                color: 'var(--lp-on-primary)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              Show More
            </button>
          </div>
        )}

        {editable && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                const newItems = [
                  ...items,
                  {
                    id: `new-${Date.now()}`,
                    name: `Apparel Item ${items.length + 1}`,
                    price: '$29.00',
                  },
                ]
                onChange({ items: newItems })
                setVisibleCount(newItems.length)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-dashed px-6 py-2 text-sm font-medium hover:bg-black/5"
              style={{ borderColor: ink(30), color: 'var(--lp-ink)' }}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        )}
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
  layoutVariant = 'ALTERNATING',
}: SectionProps<'footer'> & {
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
  layoutVariant?: LayoutVariant
}) {
  const cta: CtaRef = content?.cta ?? {}
  // Stacked collapses the promo strip to one column (its own "conventional vertical flow");
  // Alternating swaps which side the form sits on — a real mirror of the default text|form order.
  const gridClass =
    layoutVariant === 'STACKED' ? 'lg:grid-cols-1 max-w-2xl' : 'lg:grid-cols-2 max-w-6xl'
  const orderClass = layoutVariant === 'ALTERNATING' ? 'lg:[&>*:first-child]:order-2' : ''

  return (
    <section
      id="contact"
      className="w-full max-w-none py-14"
      style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
    >
      <div className={`mx-auto grid items-center gap-8 px-6 lg:px-8 ${gridClass} ${orderClass}`}>
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
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--lp-on-primary)',
                    color: 'var(--lp-primary)',
                    borderRadius: 'var(--lp-radius)',
                  }}
                >
                  {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
                </span>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <a
                href={cta.url}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--lp-on-primary)',
                  color: 'var(--lp-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
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
            <div
              className="p-5"
              style={{ backgroundColor: inv(12), borderRadius: 'var(--lp-radius)' }}
            >
              <div className="[&_label]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_80%,var(--lp-primary))] [&_input]:!border-0 [&_input]:!bg-[color:var(--lp-on-primary)] [&_input]:!px-4 [&_input]:!py-2 [&_input]:!text-[color:var(--lp-primary)] [&_select]:!border-0 [&_select]:!bg-[color:var(--lp-on-primary)] [&_select]:!px-4 [&_select]:!text-[color:var(--lp-primary)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_65%,var(--lp-primary))] [&_button]:!text-[color:var(--lp-on-primary)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-on-primary)_25%,var(--lp-primary))] [&_input]:![border-radius:var(--lp-radius)] [&_select]:![border-radius:var(--lp-radius)]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--lp-on-primary)',
                  color: 'var(--lp-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
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
  layoutVariant = 'ALTERNATING',
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
  layoutVariant?: LayoutVariant
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
      className="min-h-screen antialiased flex flex-col"
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

      <main className="flex-grow">
        {!isHidden('products') && (
          <ProductsSection
            content={c.products}
            editable={editable}
            onChange={(patch) => slotChange('products', patch)}
            layoutVariant={layoutVariant}
          />
        )}
      </main>

      <PromoFooterSection
        content={c.footer}
        editable={editable}
        onChange={(patch) => slotChange('footer', patch)}
        hasForm={hasForm}
        formFields={formFields}
        onFormFields={onFormFields}
        submitLabel={submitLabel}
        layoutVariant={layoutVariant}
      />
    </div>
  )
}
