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

/** CSS custom-property name for type sitting on a tone surface. */
const TONE_FG_VAR: Record<Tone, string> = {
  bg: '--lp-ink',
  ink: '--lp-bg',
  primary: '--lp-on-primary',
  card: '--lp-ink',
  clear: '--lp-ink',
}

/** CSS custom-property name for type sitting on a wash surface. */
const WASH_FG_VAR: Record<WashColor, string> = {
  ink: '--lp-bg',
  primary: '--lp-on-primary',
  bg: '--lp-ink',
  card: '--lp-ink',
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

/**
 * Wash that differs from the panel surface. Text color is handled separately
 * via FrameInner so type always tracks the surface under it (theme-safe even
 * when primary ≈ ink, as in Shopfront / Workshop).
 */
export function washForIndex(i: number, tone: Tone = 'bg'): { color: WashColor; edge: WashEdge } {
  const edges: WashEdge[] = ['bottom', 'left', 'top', 'right', 'bottom']
  const byTone: Record<Tone, WashColor[]> = {
    bg: ['primary', 'ink'],
    card: ['primary', 'ink'],
    clear: ['primary', 'ink'],
    ink: ['primary', 'bg'],
    primary: ['ink', 'bg'],
  }
  const colors = byTone[tone]
  return {
    color: colors[i % colors.length]!,
    edge: edges[i % edges.length]!,
  }
}

function mixReadableColor(fromVar: string, toVar: string, t: number): string {
  const pct = Math.max(0, Math.min(1, t))
  return `color-mix(in srgb, var(${fromVar}) ${(1 - pct) * 100}%, var(${toVar}) ${pct * 100}%)`
}

/** Crossfade type from tone foreground → wash foreground as the wash fills. */
export function useWashReadableColor(
  progress: MotionValue<number>,
  tone: Tone,
  wash: WashColor,
): MotionValue<string> {
  const disabled = useStudioMotionDisabled()
  const from = TONE_FG_VAR[tone]
  const to = WASH_FG_VAR[wash]
  return useTransform(progress, (p) =>
    mixReadableColor(from, to, disabled ? 0.55 : (p - 0.18) / 0.34),
  )
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
      data-lp-tone={tone}
    >
      {children}
    </section>
  )
})

function FrameInnerWash({
  children,
  className,
  progress,
  tone,
  wash,
}: {
  children: ReactNode
  className: string
  progress: MotionValue<number>
  tone: Tone
  wash: WashColor
}) {
  const color = useWashReadableColor(progress, tone, wash)
  return (
    <motion.div className={`relative z-10 ${FRAME} ${className}`} style={{ color }}>
      {children}
    </motion.div>
  )
}

export function FrameInner({
  children,
  className = '',
  progress,
  tone = 'bg',
  wash,
}: {
  children: ReactNode
  className?: string
  progress?: MotionValue<number>
  tone?: Tone
  wash?: WashColor
}) {
  if (progress && wash) {
    return (
      <FrameInnerWash className={className} progress={progress} tone={tone} wash={wash}>
        {children}
      </FrameInnerWash>
    )
  }
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
