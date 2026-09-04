import { motion, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import type { ServiceItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, Eyebrow, SectionHeader, type SectionProps } from './shared'
import {
  ColorWash,
  FrameInner,
  SnapPanel,
  useMotionPanel,
  washForIndex,
  type Tone,
} from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { BODY, TITLE } from './tokens'

const TONES: Tone[] = ['bg', 'ink', 'primary']

/**
 * Frame gesture: image Ken-Burns (scale down) while copy slides in from the
 * opposite side — alternating direction per project. Solid fill only; no ghost word.
 */
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
  tone: Tone
}) {
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()
  const fromRight = index % 2 === 1

  const imgScale = useTransform(progress, [0.15, 0.55], [1.12, 1])
  const copyX = useTransform(progress, [0.2, 0.5], [fromRight ? 56 : -56, 0])
  const copyOpacity = useTransform(progress, [0.2, 0.45], [0, 1])

  const muted =
    tone === 'primary'
      ? 'color-mix(in srgb, var(--lp-on-primary) 72%, transparent)'
      : tone === 'ink'
        ? 'color-mix(in srgb, var(--lp-bg) 68%, transparent)'
        : 'color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg))'

  const wash = washForIndex(index + 1)

  return (
    <SnapPanel ref={ref} tone={tone} className="flex flex-col justify-center">
      <ColorWash progress={progress} color={wash.color} edge={wash.edge} />
      <FrameInner
        className={`grid items-center gap-10 lg:grid-cols-12 lg:gap-14 ${fromRight ? 'lg:[&>*:first-child]:order-2' : ''}`}
      >
        <motion.div className="lg:col-span-6" style={disabled ? undefined : { scale: imgScale }}>
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
        </motion.div>

        <motion.div
          className="group relative lg:col-span-6"
          style={disabled ? undefined : { x: copyX, opacity: copyOpacity }}
        >
          <Eyebrow>
            {editable ? (
              <CanvasText
                ariaLabel={`Service ${index + 1} label`}
                value={service.label}
                onChange={(label) => onPatch({ label })}
              />
            ) : (
              service.label
            )}
          </Eyebrow>

          {editable ? (
            <CanvasText
              as="h3"
              ariaLabel={`Service ${index + 1} headline`}
              value={service.headline ?? ''}
              onChange={(headline) => onPatch({ headline })}
              style={{ fontFamily: 'var(--lp-heading)' }}
              className={`${TITLE} mb-4`}
            />
          ) : (
            <h3 className={`${TITLE} mb-4`} style={{ fontFamily: 'var(--lp-heading)' }}>
              {service.headline}
            </h3>
          )}

          {editable ? (
            <CanvasText
              ariaLabel={`Service ${index + 1} description`}
              value={service.description ?? ''}
              onChange={(description) => onPatch({ description })}
              multiline
              style={{ color: muted }}
              className={`${BODY} mb-6 max-w-md`}
            />
          ) : (
            <p className={`${BODY} mb-6 max-w-md`} style={{ color: muted }}>
              {service.description}
            </p>
          )}

          {editable ? (
            <EditableLinkTrigger
              label={service.cta?.label ?? ''}
              url={service.cta?.url ?? '#'}
              onChange={(next) => onPatch({ cta: next })}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
                {service.cta?.label || 'Add a link'} <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </EditableLinkTrigger>
          ) : service.cta?.label ? (
            <a
              href={service.cta.url}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
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
        </motion.div>
      </FrameInner>
    </SnapPanel>
  )
}

function ServicesIntro({ content, editable, onChange }: SectionProps<'services'>) {
  const { ref, progress } = useMotionPanel()
  const wash = washForIndex(0)

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center">
      <ColorWash progress={progress} color={wash.color} edge={wash.edge} />
      <FrameInner className="flex min-h-[calc(100svh-5rem)] flex-col justify-center">
        <SectionHeader
          editable={editable}
          eyebrow="Capabilities"
          eyebrowLabel="Services eyebrow"
          title={content?.title ?? ''}
          titleLabel="Services title"
          onTitle={(title) => onChange({ title })}
          body={content?.body ?? ''}
          bodyLabel="Services body"
          onBody={(body) => onChange({ body })}
        />
      </FrameInner>
    </SnapPanel>
  )
}

export function ServicesSection({ content, editable, onChange }: SectionProps<'services'>) {
  const items = content?.items ?? []

  return (
    <>
      {(content?.title || content?.body || editable) && (
        <ServicesIntro content={content} editable={editable} onChange={onChange} />
      )}
      {items.map((service, i) => (
        <ServicePanel
          key={i}
          service={service}
          index={i}
          editable={editable}
          tone={TONES[i % TONES.length]!}
          onPatch={(patch) =>
            onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
          }
          onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
        />
      ))}
      {editable ? (
        <div className="px-6 py-8 sm:px-8 lg:px-12" style={{ backgroundColor: 'var(--lp-bg)' }}>
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
