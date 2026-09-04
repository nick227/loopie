import { motion, useTransform, type MotionValue } from 'framer-motion'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { FeatureItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, SectionHeader, type SectionProps } from './shared'
import { ColorWash, FrameInner, SnapPanel, useMotionPanel, washForIndex } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { BODY } from './tokens'

/**
 * Frame gesture: process steps — the index numeral shrinks from display-scale
 * into a quiet marker as the row settles (sequence, so numbers earn their keep).
 */
function FeatureRow({
  index,
  feature,
  editable,
  progress,
  onPatch,
  onRemove,
}: {
  index: number
  feature: FeatureItem
  editable: boolean
  progress: MotionValue<number>
  onPatch: (patch: Partial<FeatureItem>) => void
  onRemove: () => void
}) {
  const disabled = useStudioMotionDisabled()
  const start = 0.18 + index * 0.1
  const end = start + 0.2
  const numScale = useTransform(progress, [start, end], [1.55, 1])
  const numOpacity = useTransform(progress, [start, end], [0.25, 0.45])
  const rowY = useTransform(progress, [start, end], [28, 0])
  const rowOpacity = useTransform(progress, [start, end], [0, 1])

  return (
    <motion.div
      className="group relative grid grid-cols-[4.5rem_1fr] gap-4 border-t py-8 sm:grid-cols-[6rem_1fr] sm:gap-8"
      style={{
        borderColor: 'color-mix(in srgb, currentColor 22%, transparent)',
        ...(disabled ? {} : { y: rowY, opacity: rowOpacity }),
      }}
    >
      <motion.span
        className="text-4xl font-bold tabular-nums sm:text-5xl"
        style={{
          fontFamily: 'var(--lp-heading)',
          ...(disabled ? { opacity: 0.4 } : { scale: numScale, opacity: numOpacity }),
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </motion.span>
      <div className="max-w-xl">
        {editable ? (
          <>
            <CanvasText
              as="h3"
              ariaLabel={`Feature ${index + 1} title`}
              value={feature.title}
              onChange={(title) => onPatch({ title })}
              className="mb-2 text-xl font-semibold tracking-tight"
            />
            <CanvasText
              ariaLabel={`Feature ${index + 1} body`}
              value={feature.body}
              onChange={(body) => onPatch({ body })}
              multiline
              className={`${BODY} opacity-80`}
            />
          </>
        ) : (
          <>
            <h3 className="mb-2 text-xl font-semibold tracking-tight">{feature.title}</h3>
            <p className={`${BODY} opacity-80`}>{feature.body}</p>
          </>
        )}
      </div>
      {editable ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="absolute right-0 top-8 text-xs opacity-0 group-hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </motion.div>
  )
}

export function FeaturesSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []
  const { ref, progress } = useMotionPanel()

  const wash = washForIndex(5, 'primary')

  return (
    <SnapPanel ref={ref} tone="primary" className="flex flex-col justify-center">
      <ColorWash progress={progress} color={wash.color} edge={wash.edge} />
      <FrameInner progress={progress} tone="primary" wash={wash.color}>
        <SectionHeader
          editable={editable}
          eyebrow="How we work"
          eyebrowLabel="Features eyebrow"
          title={content?.headline ?? ''}
          titleLabel="Features headline"
          onTitle={(headline) => onChange({ headline })}
          body={content?.body ?? ''}
          bodyLabel="Features body"
          onBody={(body) => onChange({ body })}
          className="mb-10"
        />

        <div>
          {items.map((feature, i) => (
            <FeatureRow
              key={i}
              index={i}
              feature={feature}
              editable={editable}
              progress={progress}
              onPatch={(patch) =>
                onChange({
                  items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
                })
              }
              onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
            />
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add step"
            onClick={() => onChange({ items: [...items, { title: 'New step', body: '' }] })}
          />
        ) : null}
      </FrameInner>
    </SnapPanel>
  )
}
