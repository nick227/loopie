import { forwardRef, type ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useStudioMotionDisabled } from './motion'
import { FRAME } from './tokens'

export type Tone = 'bg' | 'ink' | 'primary' | 'card' | 'clear'
export type WashColor = 'ink' | 'primary' | 'bg' | 'card'
export type WashEdge = 'bottom' | 'top' | 'left' | 'right'

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  bg: { backgroundColor: 'var(--lp-bg)', color: 'var(--lp-ink)' },
  ink: { backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' },
  primary: { backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' },
  card: { backgroundColor: 'var(--lp-card)', color: 'var(--lp-ink)' },
  clear: { backgroundColor: 'transparent', color: 'var(--lp-ink)' },
}

const WASH_BG: Record<WashColor, string> = {
  ink: 'var(--lp-ink)',
  primary: 'var(--lp-primary)',
  bg: 'var(--lp-bg)',
  card: 'var(--lp-card)',
}

/**
 * Scroll-linked solid color plane — the Contact signature, reused on most frames.
 * Grows from an edge as the panel traverses the viewport.
 */
export function ColorWash({
  progress,
  color = 'ink',
  edge = 'bottom',
  rest = '38%',
}: {
  progress: MotionValue<number>
  color?: WashColor
  edge?: WashEdge
  /** Settled size when motion is disabled / capture. */
  rest?: string
}) {
  const disabled = useStudioMotionDisabled()
  const grow = useTransform(progress, [0.12, 0.55], ['0%', '100%'])

  const edgeStyle: React.CSSProperties =
    edge === 'bottom'
      ? { left: 0, right: 0, bottom: 0, height: disabled ? rest : undefined }
      : edge === 'top'
        ? { left: 0, right: 0, top: 0, height: disabled ? rest : undefined }
        : edge === 'left'
          ? { top: 0, bottom: 0, left: 0, width: disabled ? rest : undefined }
          : { top: 0, bottom: 0, right: 0, width: disabled ? rest : undefined }

  const motionStyle =
    edge === 'bottom' || edge === 'top'
      ? { height: disabled ? undefined : grow }
      : { width: disabled ? undefined : grow }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-0"
      style={{
        backgroundColor: WASH_BG[color],
        ...edgeStyle,
        ...(disabled ? {} : motionStyle),
      }}
    />
  )
}

/** Alternating wash recipe so consecutive frames feel related but not identical. */
export function washForIndex(i: number): { color: WashColor; edge: WashEdge } {
  const colors: WashColor[] = ['ink', 'primary', 'bg', 'ink', 'primary']
  const edges: WashEdge[] = ['bottom', 'left', 'top', 'right', 'bottom']
  return {
    color: colors[i % colors.length]!,
    edge: edges[i % edges.length]!,
  }
}

export const SnapPanel = forwardRef<
  HTMLElement,
  {
    children: ReactNode
    tone?: Tone
    className?: string
    id?: string
    snap?: boolean
    fill?: boolean
  }
>(function SnapPanel({ children, tone = 'bg', className = '', id, snap = true, fill = true }, ref) {
  return (
    <section
      ref={ref}
      id={id}
      className={`relative overflow-hidden ${fill ? 'min-h-[100svh]' : ''} ${snap && fill ? 'snap-start snap-always' : ''} ${className}`}
      style={TONE_STYLE[tone]}
    >
      {children}
    </section>
  )
})

export function FrameInner({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`relative z-10 ${FRAME} ${className}`}>{children}</div>
}

export function useFrameProgress(ref: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return scrollYProgress
}

export function useMotionPanel() {
  const ref = useRef<HTMLElement>(null)
  const progress = useFrameProgress(ref)
  return { ref, progress }
}
