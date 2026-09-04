import { motion, useTransform, type MotionValue } from 'framer-motion'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { FeatureItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { KineticBackdrop, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { inv, kineticWord } from './tokens'

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
  const dir = index % 2 ? 1 : -1
  const x = useTransform(progress, [0, 0.5, 1], [dir * 70, 0, dir * -35])

  return (
    <motion.div
      className="group relative grid grid-cols-1 gap-3 py-8 sm:grid-cols-[8rem_1fr] sm:gap-8"
      style={disabled ? undefined : { x }}
    >
      <span
        className="text-5xl font-black tabular-nums"
        style={{ fontFamily: 'var(--lp-heading)', color: inv(35) }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="max-w-xl">
        {editable ? (
          <>
            <CanvasText
              as="h3"
              ariaLabel={`Feature ${index + 1} title`}
              value={feature.title}
              onChange={(title) => onPatch({ title })}
              className="mb-2 text-2xl font-black uppercase tracking-tight"
            />
            <CanvasText
              ariaLabel={`Feature ${index + 1} body`}
              value={feature.body}
              onChange={(body) => onPatch({ body })}
              multiline
              className="leading-relaxed opacity-80"
            />
          </>
        ) : (
          <>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight">{feature.title}</h3>
            <p className="leading-relaxed opacity-80">{feature.body}</p>
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
  const word = kineticWord(content?.headline, 'PROCESS')

  return (
    <SnapPanel ref={ref} tone="primary" className="flex flex-col justify-center">
      <KineticBackdrop word={word} progress={progress} mode="crush" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 lg:px-8">
        <div className="mb-14 max-w-2xl">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Features headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)' }}
                className="mb-3 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
              />
              <CanvasText
                ariaLabel="Features body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                className="text-lg opacity-80"
              />
            </>
          ) : (
            <>
              <h2
                className="mb-3 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
                style={{ fontFamily: 'var(--lp-heading)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg opacity-80">{content?.body}</p>
            </>
          )}
        </div>
        <div
          className="divide-y"
          style={{ borderColor: 'color-mix(in srgb, var(--lp-on-primary) 25%, transparent)' }}
        >
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
      </div>
    </SnapPanel>
  )
}
