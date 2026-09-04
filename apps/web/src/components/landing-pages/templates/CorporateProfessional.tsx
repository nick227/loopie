import { useState } from 'react'
import {
  ArrowRight,
  Globe,
  Briefcase,
  Building,
  BarChart,
  PieChart,
  Compass,
  Cpu,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Quote,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  ServiceItem,
  TestimonialItem,
  FaqItem,
  LogoItem,
  MetricItem,
  ComparisonItem,
  FeatureItem,
  NavLink,
} from '../../../pages/landing-pages/components/types'

const IconMap: Record<string, React.ElementType> = {
  ArrowRight,
  Globe,
  Briefcase,
  Building,
  BarChart,
  PieChart,
  Compass,
  Cpu,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
}

// Same token vocabulary and fallbacks as PageCanvas.tsx — this is what "theming works on every
// layout" means structurally: any renderer that sets these same --lp-* custom properties on its
// own wrapper picks up theme changes for free, without needing to know about this template.
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
const inv = (mix: number) => `color-mix(in srgb, var(--lp-bg) ${mix}%, var(--lp-ink))`

type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="absolute right-2 top-2 rounded-full p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:text-red-500"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--lp-card) 90%, transparent)',
        color: ink(55),
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-100"
      style={{ color: ink(55) }}
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  )
}

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const badges = content?.badges ?? []
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
        <div className="text-center lg:col-span-7 lg:text-left">
          {badges.map((badge, i) => (
            <span
              key={i}
              className="mb-6 inline-block px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                backgroundColor: ink(8),
                color: ink(80),
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {badge}
            </span>
          ))}
          {editable ? (
            <CanvasText
              as="h1"
              ariaLabel="Hero headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              placeholder="Headline"
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              className="mb-8 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight lg:text-7xl"
            />
          ) : (
            <h1
              className="mb-8 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight lg:text-7xl"
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
              placeholder="Subheadline"
              style={{ color: ink(72) }}
              className="mx-auto mb-10 max-w-xl text-lg leading-relaxed lg:mx-0"
            />
          ) : (
            <p
              className="mx-auto mb-10 max-w-xl text-lg leading-relaxed lg:mx-0"
              style={{ color: ink(72) }}
            >
              {content?.body}
            </p>
          )}
          <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            {editable ? (
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ primaryCta: next })}
              >
                <span
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold"
                  style={{
                    backgroundColor: 'var(--lp-primary)',
                    color: 'var(--lp-on-primary)',
                    borderRadius: 'var(--lp-radius)',
                  }}
                >
                  {cta.label || 'Add a call to action'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <a
                href={cta.url}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--lp-primary)',
                  color: 'var(--lp-on-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
              >
                {cta.label}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="relative w-full lg:col-span-5">
          {editable ? (
            <div
              className="aspect-[4/3] w-full overflow-hidden"
              style={{ borderRadius: 'var(--lp-radius)' }}
            >
              <MediaSlotField
                kind="IMAGE"
                urlMode
                fallbackUrl={media.url}
                onUrlChange={(url) => onChange({ media: { ...media, url } })}
              />
            </div>
          ) : (
            <img
              src={media.url}
              alt={media.alt || 'Hero Image'}
              className="aspect-[4/3] w-full object-cover"
              style={{ borderRadius: 'var(--lp-radius)' }}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function LogoCloudSection({ content, editable, onChange }: SectionProps<'logos'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<LogoItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section
      className="py-12 border-y"
      style={{ backgroundColor: 'var(--lp-bg)', borderColor: ink(10) }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Logos title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            placeholder="Trusted by..."
            style={{ color: ink(55) }}
            className="text-center text-sm font-semibold uppercase tracking-widest mb-8"
          />
        ) : (
          <p
            className="text-center text-sm font-semibold uppercase tracking-widest mb-8"
            style={{ color: ink(55) }}
          >
            {content?.title}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
          {items.map((logo, i) => {
            const Icon = logo.icon ? IconMap[logo.icon] : null
            return (
              <div
                key={i}
                className="group relative flex items-center gap-2"
                style={{ color: 'var(--lp-ink)' }}
              >
                {Icon && <Icon className="w-8 h-8" />}
                {editable ? (
                  <CanvasText
                    ariaLabel={`Logo ${i + 1} name`}
                    value={logo.name}
                    onChange={(name) => updateItem(i, { name })}
                    className="text-xl font-bold tracking-tight"
                  />
                ) : (
                  <span className="text-xl font-bold tracking-tight">{logo.name}</span>
                )}
                {editable ? (
                  <RemoveRowButton
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
        {editable ? (
          <div className="text-center">
            <AddRowButton
              label="Add logo"
              onClick={() => onChange({ items: [...items, { name: 'New logo' }] })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ServiceSelectorSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []
  const [activeId, setActiveId] = useState(items[0]?.id ?? items[0]?.label)
  const activeService = items.find((s) => (s.id ?? s.label) === activeId) ?? items[0]

  function updateItem(i: number, patch: Partial<ServiceItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <section id="services" className="py-24" style={{ backgroundColor: ink(4) }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Services title"
              value={content?.title ?? ''}
              onChange={(title) => onChange({ title })}
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
            />
          ) : (
            <h2
              className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
              style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            >
              {content?.title}
            </h2>
          )}
          {editable ? (
            <CanvasText
              ariaLabel="Services body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              style={{ color: ink(72) }}
              className="text-lg"
            />
          ) : (
            <p className="text-lg" style={{ color: ink(72) }}>
              {content?.body}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-4">
            {items.map((service, i) => {
              const Icon = service.icon ? IconMap[service.icon] : null
              const key = service.id ?? service.label
              const isActive = activeId === key
              return (
                <div
                  key={i}
                  className="group relative text-left p-6 rounded-2xl transition-all duration-300 border"
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--lp-card)',
                          borderColor: ink(15),
                          boxShadow: '0 20px 40px -20px rgba(0,0,0,0.15)',
                        }
                      : { backgroundColor: 'transparent', borderColor: 'transparent' }
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(key)}
                    className="flex w-full items-center gap-4 mb-1 text-left"
                  >
                    <div
                      className="p-3 rounded-xl transition-colors duration-300"
                      style={
                        isActive
                          ? { backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }
                          : { backgroundColor: ink(10), color: ink(70) }
                      }
                    >
                      {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    {editable ? (
                      <CanvasText
                        ariaLabel={`Service ${i + 1} label`}
                        value={service.label}
                        onChange={(label) => updateItem(i, { label })}
                        style={{ color: isActive ? 'var(--lp-ink)' : ink(65) }}
                        className="text-xl font-bold"
                      />
                    ) : (
                      <h3
                        className="text-xl font-bold"
                        style={{ color: isActive ? 'var(--lp-ink)' : ink(65) }}
                      >
                        {service.label}
                      </h3>
                    )}
                  </button>
                  {isActive && (
                    <div className="pl-16">
                      {editable ? (
                        <CanvasText
                          ariaLabel={`Service ${i + 1} description`}
                          value={service.description ?? ''}
                          onChange={(description) => updateItem(i, { description })}
                          multiline
                          style={{ color: ink(72) }}
                          className="leading-relaxed"
                        />
                      ) : (
                        <p className="leading-relaxed" style={{ color: ink(72) }}>
                          {service.description}
                        </p>
                      )}
                    </div>
                  )}
                  {editable ? (
                    <RemoveRowButton
                      onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    />
                  ) : null}
                </div>
              )
            })}
            {editable ? (
              <AddRowButton
                label="Add service"
                onClick={() =>
                  onChange({
                    items: [...items, { label: 'New service', id: `service-${items.length}` }],
                  })
                }
              />
            ) : null}
          </div>
          <div className="lg:col-span-7">
            {activeService && (
              <div
                className="relative group rounded-3xl overflow-hidden shadow-2xl border"
                style={{ backgroundColor: 'var(--lp-card)', borderColor: ink(10) }}
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  {editable ? (
                    <MediaSlotField
                      kind="IMAGE"
                      urlMode
                      fallbackUrl={activeService.media?.url}
                      onUrlChange={(url) =>
                        updateItem(items.indexOf(activeService), {
                          media: { ...activeService.media, url },
                        })
                      }
                    />
                  ) : (
                    <img
                      src={activeService.media?.url}
                      alt={activeService.media?.alt}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-8">
                  {editable ? (
                    <>
                      <CanvasText
                        as="h3"
                        ariaLabel={`Service ${items.indexOf(activeService) + 1} headline`}
                        value={activeService.headline ?? ''}
                        onChange={(headline) =>
                          updateItem(items.indexOf(activeService), { headline })
                        }
                        style={{ color: 'var(--lp-ink)' }}
                        className="text-2xl font-bold mb-4"
                      />
                      <EditableLinkTrigger
                        label={activeService.cta?.label ?? ''}
                        url={activeService.cta?.url ?? '#contact'}
                        onChange={(next) => updateItem(items.indexOf(activeService), { cta: next })}
                      >
                        <span
                          className="inline-flex items-center font-semibold"
                          style={{ color: 'var(--lp-primary)' }}
                        >
                          {activeService.cta?.label || 'Add a call to action'}
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </span>
                      </EditableLinkTrigger>
                    </>
                  ) : (
                    <>
                      {activeService.headline ? (
                        <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--lp-ink)' }}>
                          {activeService.headline}
                        </h3>
                      ) : null}
                      {activeService.cta?.label ? (
                        <a
                          href={activeService.cta.url}
                          className="inline-flex items-center font-semibold"
                          style={{ color: 'var(--lp-primary)' }}
                        >
                          {activeService.cta.label}
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricsSection({ content, editable, onChange }: SectionProps<'metrics'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<MetricItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="py-24" style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div
          className="grid md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x"
          style={{ borderColor: inv(20) }}
        >
          {items.map((metric, i) => (
            <div
              key={i}
              className="group relative pt-12 md:pt-0 md:px-12 first:pt-0 first:px-0 text-center"
            >
              {editable ? (
                <>
                  <CanvasText
                    ariaLabel={`Metric ${i + 1} value`}
                    value={metric.value}
                    onChange={(value) => updateItem(i, { value })}
                    className="mb-4 text-center text-6xl font-extrabold tracking-tight md:text-7xl"
                  />
                  <CanvasText
                    ariaLabel={`Metric ${i + 1} label`}
                    value={metric.label}
                    onChange={(label) => updateItem(i, { label })}
                    className="text-xl font-semibold mb-3 text-center"
                  />
                  <CanvasText
                    ariaLabel={`Metric ${i + 1} description`}
                    value={metric.description ?? ''}
                    onChange={(description) => updateItem(i, { description })}
                    multiline
                    style={{ color: inv(65) }}
                    className="text-center"
                  />
                  <RemoveRowButton
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  />
                </>
              ) : (
                <>
                  <div className="mb-4 text-6xl font-extrabold tracking-tight md:text-7xl">
                    {metric.value}
                  </div>
                  <div className="text-xl font-semibold mb-3">{metric.label}</div>
                  <p style={{ color: inv(65) }}>{metric.description}</p>
                </>
              )}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRowButton
            label="Add metric"
            onClick={() => onChange({ items: [...items, { value: '0', label: 'New metric' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

function FeatureGridSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<FeatureItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section id="features" className="py-24" style={{ backgroundColor: 'var(--lp-bg)' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="mb-16 max-w-3xl text-left">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Features headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="mb-4 text-3xl font-extrabold tracking-tight md:text-5xl"
              />
              <CanvasText
                ariaLabel="Features body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(72) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="mb-4 text-3xl font-extrabold tracking-tight md:text-5xl"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(72) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div
          className="grid gap-px overflow-hidden md:grid-cols-2 lg:grid-cols-3"
          style={{
            backgroundColor: ink(12),
            border: `1px solid ${ink(12)}`,
            borderRadius: 'var(--lp-radius)',
          }}
        >
          {items.map((feature, i) => {
            const Icon = feature.icon ? IconMap[feature.icon] : null
            return (
              <div
                key={i}
                className={`group relative p-8 ${i === 0 ? 'md:col-span-2 lg:col-span-1 lg:row-span-1' : ''}`}
                style={{ backgroundColor: 'var(--lp-bg)' }}
              >
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center"
                  style={{
                    backgroundColor: ink(8),
                    color: 'var(--lp-primary)',
                    borderRadius: 'var(--lp-radius)',
                  }}
                >
                  {Icon && <Icon className="h-6 w-6" />}
                </div>
                {editable ? (
                  <>
                    <CanvasText
                      as="h3"
                      ariaLabel={`Feature ${i + 1} title`}
                      value={feature.title}
                      onChange={(title) => updateItem(i, { title })}
                      style={{ color: 'var(--lp-ink)' }}
                      className="text-xl font-bold mb-3"
                    />
                    <CanvasText
                      ariaLabel={`Feature ${i + 1} body`}
                      value={feature.body}
                      onChange={(body) => updateItem(i, { body })}
                      multiline
                      style={{ color: ink(72) }}
                      className="leading-relaxed"
                    />
                    <RemoveRowButton
                      onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    />
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--lp-ink)' }}>
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed" style={{ color: ink(72) }}>
                      {feature.body}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {editable ? (
          <AddRowButton
            label="Add feature"
            onClick={() => onChange({ items: [...items, { title: 'New feature', body: '' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

function ComparisonSection({ content, editable, onChange }: SectionProps<'comparison'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<ComparisonItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="py-24 border-t" style={{ backgroundColor: ink(4), borderColor: ink(12) }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Comparison title"
            value={content?.title ?? ''}
            onChange={(title) => onChange({ title })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight"
          />
        ) : (
          <h2
            className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.title}
          </h2>
        )}
        <div
          className="rounded-3xl shadow-xl overflow-hidden border"
          style={{ backgroundColor: 'var(--lp-card)', borderColor: ink(12) }}
        >
          <div
            className="grid grid-cols-3 p-6 font-bold text-lg md:text-xl"
            style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' }}
          >
            <div className="col-span-1">Feature</div>
            <div className="col-span-1 text-center">Us</div>
            <div className="col-span-1 text-center" style={{ color: inv(65) }}>
              Them
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: ink(10) }}>
            {items.map((item, i) => (
              <div
                key={i}
                className="group relative grid grid-cols-3 p-6 items-center transition-colors"
              >
                {editable ? (
                  <>
                    <CanvasText
                      ariaLabel={`Row ${i + 1} feature`}
                      value={item.feature}
                      onChange={(feature) => updateItem(i, { feature })}
                      style={{ color: 'var(--lp-ink)' }}
                      className="col-span-1 font-semibold"
                    />
                    <CanvasText
                      ariaLabel={`Row ${i + 1} us`}
                      value={String(item.us)}
                      onChange={(us) => updateItem(i, { us })}
                      style={{ color: 'var(--lp-ink)' }}
                      className="col-span-1 text-center font-bold"
                    />
                    <CanvasText
                      ariaLabel={`Row ${i + 1} them`}
                      value={String(item.them)}
                      onChange={(them) => updateItem(i, { them })}
                      style={{ color: ink(55) }}
                      className="col-span-1 text-center"
                    />
                    <RemoveRowButton
                      onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    />
                  </>
                ) : (
                  <>
                    <div className="col-span-1 font-semibold" style={{ color: 'var(--lp-ink)' }}>
                      {item.feature}
                    </div>
                    <div
                      className="col-span-1 text-center font-bold flex justify-center"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      {typeof item.us === 'boolean' ? (
                        item.us ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <XCircle className="w-6 h-6" style={{ color: ink(25) }} />
                        )
                      ) : (
                        item.us
                      )}
                    </div>
                    <div
                      className="col-span-1 text-center flex justify-center"
                      style={{ color: ink(55) }}
                    >
                      {typeof item.them === 'boolean' ? (
                        item.them ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <XCircle className="w-6 h-6" style={{ color: ink(25) }} />
                        )
                      ) : (
                        item.them
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        {editable ? (
          <AddRowButton
            label="Add row"
            onClick={() =>
              onChange({ items: [...items, { feature: 'New row', us: '', them: '' }] })
            }
          />
        ) : null}
      </div>
    </section>
  )
}

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section
      id="testimonials"
      className="py-24"
      style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Testimonials headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)' }}
                className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
              />
              <CanvasText
                ariaLabel="Testimonials body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: inv(70) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
                style={{ fontFamily: 'var(--lp-heading)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: inv(70) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {items.map((t, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-3xl border"
              style={{ backgroundColor: inv(12), borderColor: inv(20) }}
            >
              <Quote
                className="absolute top-8 right-8 w-12 h-12 opacity-50"
                style={{ color: inv(25) }}
              />
              {editable ? (
                <>
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} quote`}
                    value={t.quote}
                    onChange={(quote) => updateItem(i, { quote })}
                    multiline
                    style={{ color: inv(85) }}
                    className="text-xl leading-relaxed italic mb-8 relative z-10"
                  />
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} author`}
                    value={t.author}
                    onChange={(author) => updateItem(i, { author })}
                    className="font-bold"
                  />
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} role`}
                    value={t.role ?? ''}
                    onChange={(role) => updateItem(i, { role })}
                    style={{ color: inv(65) }}
                    className="text-sm"
                  />
                  <RemoveRowButton
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  />
                </>
              ) : (
                <>
                  <p
                    className="text-xl leading-relaxed italic mb-8 relative z-10"
                    style={{ color: inv(85) }}
                  >
                    &quot;{t.quote}&quot;
                  </p>
                  <div className="flex items-center gap-4">
                    {t.avatarUrl && (
                      <img
                        src={t.avatarUrl}
                        alt={t.author}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-bold">{t.author}</div>
                      <div className="text-sm" style={{ color: inv(65) }}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRowButton
            label="Add testimonial"
            onClick={() => onChange({ items: [...items, { quote: '', author: 'New client' }] })}
          />
        ) : null}
      </div>
    </section>
  )
}

function FAQSection({ content, editable, onChange }: SectionProps<'faq'>) {
  const items = content?.items ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  function updateItem(i: number, patch: Partial<FaqItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section
      className="py-24 border-t"
      style={{ backgroundColor: 'var(--lp-bg)', borderColor: ink(10) }}
    >
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="FAQ headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-3xl md:text-4xl font-bold mb-4 tracking-tight"
              />
              <CanvasText
                ariaLabel="FAQ body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(72) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-3xl md:text-4xl font-bold mb-4 tracking-tight"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(72) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="space-y-4">
          {items.map((faq, i) => (
            <div
              key={i}
              className="group relative border rounded-2xl overflow-hidden"
              style={{ borderColor: ink(15) }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                style={{ backgroundColor: 'var(--lp-card)' }}
              >
                {editable ? (
                  <CanvasText
                    ariaLabel={`Question ${i + 1}`}
                    value={faq.question}
                    onChange={(question) => updateItem(i, { question })}
                    style={{ color: 'var(--lp-ink)' }}
                    className="font-bold text-lg"
                  />
                ) : (
                  <span className="font-bold text-lg" style={{ color: 'var(--lp-ink)' }}>
                    {faq.question}
                  </span>
                )}
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
                  style={{ color: ink(45) }}
                />
              </button>
              {openIndex === i && (
                <div
                  className="p-6 pt-0 leading-relaxed"
                  style={{ backgroundColor: 'var(--lp-card)', color: ink(72) }}
                >
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
              )}
              {editable ? (
                <RemoveRowButton
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                />
              ) : null}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRowButton
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

// Real lead capture, not a dead link — this is the section the nav/hero/footer CTAs all point at
// (#contact). See CorporateProfessional's schema (packages/db/src/data/corporate-professional.ts):
// 'footer' is now a 'studio-contact' section, the same pattern Studio.tsx's own ContactSection
// uses, so the attached Form is actually rendered here instead of never appearing anywhere.
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
      className="py-24 border-t relative overflow-hidden"
      style={{ backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)', borderColor: inv(15) }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 grid gap-16 lg:grid-cols-2 lg:items-center">
        <div className="text-center lg:text-left">
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Closing headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              style={{ fontFamily: 'var(--lp-heading)' }}
              className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight"
            />
          ) : (
            <h2
              className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight"
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
              className="text-xl mb-6 leading-relaxed"
            />
          ) : (
            <p className="text-xl mb-6 leading-relaxed" style={{ color: inv(70) }}>
              {content?.body}
            </p>
          )}
          {editable ? (
            <EditableLinkTrigger
              label={cta.label ?? ''}
              url={cta.url ?? '#contact'}
              onChange={(next) => onChange({ cta: next })}
            >
              <span className="text-sm font-semibold underline underline-offset-4">
                {cta.label || 'Add a call to action'}
              </span>
            </EditableLinkTrigger>
          ) : cta.label && !hasForm ? (
            <a href={cta.url} className="text-sm font-semibold underline underline-offset-4">
              {cta.label}
            </a>
          ) : null}
        </div>
        <div
          className="rounded-3xl p-8"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--lp-bg) 6%, var(--lp-ink))',
            border: `1px solid ${inv(15)}`,
          }}
        >
          {!hasForm ? (
            <p className="text-sm" style={{ color: inv(60) }}>
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <>
              <div className="[&_label]:!text-[color:color-mix(in_srgb,var(--lp-bg)_70%,var(--lp-ink))] [&_input]:!border [&_input]:!border-[color:color-mix(in_srgb,var(--lp-bg)_20%,var(--lp-ink))] [&_input]:!bg-transparent [&_input]:!text-[color:var(--lp-bg)] [&_input]:![border-radius:var(--lp-radius)] [&_select]:!border [&_select]:!border-[color:color-mix(in_srgb,var(--lp-bg)_20%,var(--lp-ink))] [&_select]:!bg-transparent [&_select]:!text-[color:var(--lp-bg)] [&_select]:![border-radius:var(--lp-radius)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-bg)_60%,var(--lp-ink))] [&_button]:!text-[color:var(--lp-bg)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-bg)_25%,var(--lp-ink))]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-6 inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold"
                style={{
                  backgroundColor: 'var(--lp-primary)',
                  color: 'var(--lp-on-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
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

function NavBar({
  content,
  editable,
  onChange,
}: {
  content: PageContent['nav']
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent['nav']>>) => void
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const brand = content?.brand ?? ''
  const links = content?.links ?? []
  const contactIndex = links.findIndex((link) => link.url === '#contact')
  const contactLink =
    contactIndex >= 0 ? links[contactIndex]! : { label: 'Get in Touch', url: '#contact' }
  const menuLinks = contactIndex >= 0 ? links.filter((_, index) => index !== contactIndex) : links

  function updateLink(i: number, patch: Partial<NavLink>) {
    onChange({ links: links.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  return (
    <nav className="sticky top-0 z-50 w-full px-4 pt-4 lg:px-6">
      <div
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-5"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--lp-bg) 92%, transparent)',
          border: `1px solid ${ink(12)}`,
          borderRadius: 'var(--lp-radius)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center"
            style={{
              backgroundColor: 'var(--lp-primary)',
              borderRadius: 'var(--lp-radius)',
            }}
          >
            <div
              className="h-3.5 w-3.5 rotate-45"
              style={{ backgroundColor: 'var(--lp-on-primary)' }}
            />
          </div>
          {editable ? (
            <CanvasText
              ariaLabel="Brand name"
              value={brand}
              onChange={(next) => onChange({ brand: next })}
              placeholder="Brand"
              style={{ color: 'var(--lp-ink)' }}
              className="w-auto truncate text-xl font-extrabold tracking-tight"
            />
          ) : (
            <span
              className="truncate text-xl font-extrabold tracking-tight"
              style={{ color: 'var(--lp-ink)' }}
            >
              {brand}
            </span>
          )}
        </div>

        <div
          className="hidden items-center gap-1 rounded-full px-2 py-1 md:flex"
          style={{ backgroundColor: ink(6) }}
        >
          {menuLinks.map((link) => {
            const sourceIndex = links.indexOf(link)
            return editable ? (
              <EditableLinkTrigger
                key={sourceIndex}
                label={link.label}
                url={link.url}
                onChange={(next) => updateLink(sourceIndex, next)}
              >
                <span
                  className="px-3 py-1.5 text-sm font-semibold"
                  style={{ color: ink(70), borderRadius: 'var(--lp-radius)' }}
                >
                  {link.label}
                </span>
              </EditableLinkTrigger>
            ) : (
              <a
                key={sourceIndex}
                href={link.url}
                className="px-3 py-1.5 text-sm font-semibold transition-colors"
                style={{ color: ink(70), borderRadius: 'var(--lp-radius)' }}
              >
                {link.label}
              </a>
            )
          })}
          {editable ? (
            <button
              type="button"
              onClick={() => onChange({ links: [...links, { label: 'New link', url: '#' }] })}
              aria-label="Add nav link"
              className="px-2 py-1.5 text-sm font-medium"
              style={{ color: ink(50) }}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="hidden items-center md:flex">
          {editable && contactIndex >= 0 ? (
            <EditableLinkTrigger
              label={contactLink.label}
              url={contactLink.url}
              onChange={(next) => updateLink(contactIndex, next)}
            >
              <span
                className="inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold"
                style={{
                  backgroundColor: 'var(--lp-primary)',
                  color: 'var(--lp-on-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
              >
                {contactLink.label}
                <ArrowRight className="h-4 w-4" />
              </span>
            </EditableLinkTrigger>
          ) : (
            <a
              href={contactLink.url}
              className="inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--lp-primary)',
                color: 'var(--lp-on-primary)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {contactLink.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        <button
          type="button"
          className="p-2 md:hidden"
          style={{ color: ink(70) }}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="mx-auto mt-2 max-w-6xl px-4 py-4 md:hidden"
          style={{
            backgroundColor: 'var(--lp-bg)',
            border: `1px solid ${ink(12)}`,
            borderRadius: 'var(--lp-radius)',
          }}
        >
          <div className="flex flex-col gap-3">
            {menuLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold"
                style={{ color: ink(70) }}
              >
                {link.label}
              </a>
            ))}
            <hr style={{ borderColor: ink(10) }} />
            <a
              href={contactLink.url}
              onClick={() => setMobileMenuOpen(false)}
              className="px-6 py-3 text-center text-base font-bold"
              style={{
                backgroundColor: 'var(--lp-primary)',
                color: 'var(--lp-on-primary)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {contactLink.label}
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}

export function CorporateProfessional({
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
  // Same rule as PageCanvas.tsx: hidden means hidden everywhere, including the visual Editor
  // canvas, not just the published page — that disappearance is the direct feedback that hiding
  // worked. The Content tab's visibility toggle is where a hidden section is found again.
  const isHidden = (sectionKey: string) => Boolean(layoutConfig?.sections?.[sectionKey]?.hidden)

  function slotChange<K extends keyof PageContent>(
    key: K,
    patch: Partial<NonNullable<PageContent[K]>>,
  ) {
    onSlotChange?.(key, { ...(c[key] as object | undefined), ...patch })
  }

  return (
    <div
      className="min-h-screen selection:opacity-80 antialiased"
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

      <main>
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
        {!isHidden('services') && (
          <ServiceSelectorSection
            content={c.services}
            editable={editable}
            onChange={(patch) => slotChange('services', patch)}
          />
        )}
        {!isHidden('metrics') && (
          <MetricsSection
            content={c.metrics}
            editable={editable}
            onChange={(patch) => slotChange('metrics', patch)}
          />
        )}
        {!isHidden('features') && (
          <FeatureGridSection
            content={c.features}
            editable={editable}
            onChange={(patch) => slotChange('features', patch)}
          />
        )}
        {!isHidden('comparison') && (
          <ComparisonSection
            content={c.comparison}
            editable={editable}
            onChange={(patch) => slotChange('comparison', patch)}
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
        {!isHidden('footer') && (
          <ContactSection
            content={c.footer}
            editable={editable}
            onChange={(patch) => slotChange('footer', patch)}
            hasForm={hasForm}
            formFields={formFields}
            onFormFields={onFormFields}
            submitLabel={submitLabel}
          />
        )}
      </main>
    </div>
  )
}
