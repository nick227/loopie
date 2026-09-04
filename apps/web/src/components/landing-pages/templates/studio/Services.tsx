import { ArrowUpRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import type { ServiceItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { KineticBackdrop, KineticHeadline, SnapPanel, useMotionPanel } from './SnapPanel'
import { inv, kineticWord } from './tokens'

function ServicePanel({
  service,
  index,
  editable,
  onPatch,
  onRemove,
  tone,
}: {
  service: ServiceItem
  index: number
  editable: boolean
  onPatch: (patch: Partial<ServiceItem>) => void
  onRemove: () => void
  tone: 'primary' | 'bg' | 'ink'
}) {
  const { ref, progress } = useMotionPanel()
  const word = kineticWord(service.label || service.headline, `0${index + 1}`)
  const textTone =
    tone === 'primary' ? 'var(--lp-on-primary)' : tone === 'ink' ? 'var(--lp-bg)' : 'var(--lp-ink)'
  const muted =
    tone === 'primary'
      ? 'color-mix(in srgb, var(--lp-on-primary) 75%, transparent)'
      : tone === 'ink'
        ? inv(70)
        : 'color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg))'

  return (
    <SnapPanel ref={ref} tone={tone} className="flex flex-col justify-center">
      <KineticBackdrop word={word} progress={progress} mode={index % 2 ? 'spin' : 'scale-x'} />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 py-24 lg:grid-cols-12 lg:items-center lg:px-8">
        <div className={`lg:col-span-6 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
          {editable ? (
            <MediaSlotField
              kind="IMAGE"
              urlMode
              fallbackUrl={service.media?.url}
              onUrlChange={(url) => onPatch({ media: { ...service.media, url } })}
            />
          ) : service.media?.url ? (
            <img
              src={service.media.url}
              alt={service.media.alt ?? ''}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : null}
        </div>
        <div className={`group relative lg:col-span-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
          <span
            className="mb-4 block text-sm font-bold uppercase tracking-[0.3em] opacity-60"
            style={{ color: textTone }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          {editable ? (
            <CanvasText
              ariaLabel={`Service ${index + 1} label`}
              value={service.label}
              onChange={(label) => onPatch({ label })}
              className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: muted }}
            />
          ) : (
            <p
              className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: muted }}
            >
              {service.label}
            </p>
          )}
          <KineticHeadline progress={progress}>
            {editable ? (
              <CanvasText
                as="h3"
                ariaLabel={`Service ${index + 1} headline`}
                value={service.headline ?? ''}
                onChange={(headline) => onPatch({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: textTone }}
                className="mb-4 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight"
              />
            ) : (
              <h3
                className="mb-4 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.95] tracking-tight"
                style={{ fontFamily: 'var(--lp-heading)', color: textTone }}
              >
                {service.headline}
              </h3>
            )}
          </KineticHeadline>
          {editable ? (
            <CanvasText
              ariaLabel={`Service ${index + 1} description`}
              value={service.description ?? ''}
              onChange={(description) => onPatch({ description })}
              multiline
              style={{ color: muted }}
              className="mb-5 max-w-md leading-relaxed"
            />
          ) : (
            <p className="mb-5 max-w-md leading-relaxed" style={{ color: muted }}>
              {service.description}
            </p>
          )}
          {editable ? (
            <EditableLinkTrigger
              label={service.cta?.label ?? ''}
              url={service.cta?.url ?? '#'}
              onChange={(next) => onPatch({ cta: next })}
            >
              <span
                className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest underline underline-offset-4"
                style={{ color: textTone }}
              >
                {service.cta?.label || 'Add a link'} <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </EditableLinkTrigger>
          ) : service.cta?.label ? (
            <a
              href={service.cta.url}
              className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest underline underline-offset-4"
              style={{ color: textTone }}
            >
              {service.cta.label} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove"
              className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
              style={{ color: muted }}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </SnapPanel>
  )
}

export function ServicesSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []
  const tones: Array<'primary' | 'bg' | 'ink'> = ['primary', 'bg', 'ink']

  return (
    <>
      {(content?.title || editable) && (
        <SnapPanel tone="bg" className="flex flex-col justify-center py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            {editable ? (
              <CanvasText
                as="h2"
                ariaLabel="Services title"
                value={content?.title ?? ''}
                onChange={(title) => onChange({ title })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-tighter"
              />
            ) : (
              <h2
                className="text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-tighter"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.title}
              </h2>
            )}
          </div>
        </SnapPanel>
      )}
      {items.map((service, i) => (
        <ServicePanel
          key={i}
          service={service}
          index={i}
          editable={editable}
          tone={tones[i % tones.length]!}
          onPatch={(patch) =>
            onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
          }
          onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
        />
      ))}
      {editable ? (
        <div className="px-6 py-8 lg:px-8" style={{ backgroundColor: 'var(--lp-bg)' }}>
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
    </>
  )
}
