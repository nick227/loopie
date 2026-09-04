import { motion, useTransform } from 'framer-motion'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { MetricItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { KineticBackdrop, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { inv } from './tokens'

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
  progress: ReturnType<typeof useMotionPanel>['progress']
  editable: boolean
  onPatch: (patch: Partial<MetricItem>) => void
  onRemove: () => void
}) {
  const disabled = useStudioMotionDisabled()
  const dir = index % 2 === 0 ? 1 : -1
  const x = useTransform(progress, [0, 0.5, 1], [dir * 80, 0, dir * -40])
  const scale = useTransform(progress, [0, 0.5, 1], [0.7, 1.08, 1.2])

  return (
    <motion.div
      className="group relative origin-center"
      style={disabled ? undefined : { x, scale }}
    >
      {editable ? (
        <>
          <CanvasText
            ariaLabel={`Metric ${index + 1} value`}
            value={metric.value}
            onChange={(value) => onPatch({ value })}
            style={{ fontFamily: 'var(--lp-heading)' }}
            className="text-[clamp(3.5rem,14vw,9rem)] font-black leading-none tracking-tighter"
          />
          <CanvasText
            ariaLabel={`Metric ${index + 1} label`}
            value={metric.label}
            onChange={(label) => onPatch({ label })}
            className="mt-3 text-sm font-bold uppercase tracking-widest"
            style={{ color: inv(65) }}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
            style={{ color: inv(55) }}
          >
            ×
          </button>
        </>
      ) : (
        <>
          <div
            className="text-[clamp(3.5rem,14vw,9rem)] font-black leading-none tracking-tighter"
            style={{ fontFamily: 'var(--lp-heading)' }}
          >
            {metric.value}
          </div>
          <p
            className="mt-3 text-sm font-bold uppercase tracking-widest"
            style={{ color: inv(65) }}
          >
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
      <KineticBackdrop word="PROOF" progress={progress} mode="slide" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 sm:grid-cols-3 lg:px-8">
        {items.map((metric, i) => (
          <MetricCell
            key={i}
            metric={metric}
            index={i}
            progress={progress}
            editable={editable}
            onPatch={(patch) =>
              onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
            }
            onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
          />
        ))}
      </div>
      {editable ? (
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-12 lg:px-8">
          <AddRow
            label="Add stat"
            onClick={() => onChange({ items: [...items, { value: '0', label: 'New stat' }] })}
          />
        </div>
      ) : null}
    </SnapPanel>
  )
}
