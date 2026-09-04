import { motion, useTransform, type MotionValue } from 'framer-motion'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { MetricItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, Eyebrow, type SectionProps } from './shared'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { inv } from './tokens'

/**
 * Frame gesture: each numeral rises from below and settles — staggered by index.
 * The numbers are the kinetic type; nothing sits behind them.
 */
function MetricCell({
  metric,
  index,
  progress,
  editable,
  onPatch,
  onRemove,
}: {
  metric: MetricItem
  index: number
  progress: MotionValue<number>
  editable: boolean
  onPatch: (patch: Partial<MetricItem>) => void
  onRemove: () => void
}) {
  const disabled = useStudioMotionDisabled()
  const start = 0.2 + index * 0.08
  const end = start + 0.22
  const y = useTransform(progress, [start, end], [72, 0])
  const opacity = useTransform(progress, [start, end], [0, 1])

  return (
    <motion.div
      className="group relative border-t pt-6"
      style={{
        borderColor: inv(18),
        ...(disabled ? {} : { y, opacity }),
      }}
    >
      {editable ? (
        <>
          <CanvasText
            ariaLabel={`Metric ${index + 1} value`}
            value={metric.value}
            onChange={(value) => onPatch({ value })}
            style={{ fontFamily: 'var(--lp-heading)' }}
            className="text-[clamp(3.5rem,10vw,7rem)] font-bold leading-none tracking-[-0.05em]"
          />
          <CanvasText
            ariaLabel={`Metric ${index + 1} label`}
            value={metric.label}
            onChange={(label) => onPatch({ label })}
            className="mt-4 text-sm"
            style={{ color: inv(65) }}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="absolute right-0 top-6 text-xs opacity-0 group-hover:opacity-100"
            style={{ color: inv(55) }}
          >
            ×
          </button>
        </>
      ) : (
        <>
          <div
            className="text-[clamp(3.5rem,10vw,7rem)] font-bold leading-none tracking-[-0.05em]"
            style={{ fontFamily: 'var(--lp-heading)' }}
          >
            {metric.value}
          </div>
          <p className="mt-4 text-sm" style={{ color: inv(65) }}>
            {metric.label}
          </p>
        </>
      )}
    </motion.div>
  )
}

export function MetricsSection({ content, editable, onChange }: SectionProps<'metrics'>) {
  const items = content?.items ?? []
  const { ref, progress } = useMotionPanel()

  return (
    <SnapPanel ref={ref} tone="ink" className="flex flex-col justify-center">
      <FrameInner>
        <Eyebrow>By the numbers</Eyebrow>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          {items.map((metric, i) => (
            <MetricCell
              key={i}
              metric={metric}
              index={i}
              progress={progress}
              editable={editable}
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
            label="Add stat"
            onClick={() => onChange({ items: [...items, { value: '0', label: 'New stat' }] })}
          />
        ) : null}
      </FrameInner>
    </SnapPanel>
  )
}
