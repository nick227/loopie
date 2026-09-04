import { forwardRef, type ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useStudioMotionDisabled } from './motion'

type Tone = 'bg' | 'ink' | 'primary' | 'card'

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  bg: { backgroundColor: 'var(--lp-bg)', color: 'var(--lp-ink)' },
  ink: { backgroundColor: 'var(--lp-ink)', color: 'var(--lp-bg)' },
  primary: { backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' },
  card: { backgroundColor: 'var(--lp-card)', color: 'var(--lp-ink)' },
}

export const SnapPanel = forwardRef<
  HTMLElement,
  {
    children: ReactNode
    tone?: Tone
    className?: string
    id?: string
    snap?: boolean
  }
>(function SnapPanel({ children, tone = 'bg', className = '', id, snap = true }, ref) {
  return (
    <section
      ref={ref}
      id={id}
      className={`relative overflow-hidden ${snap ? 'min-h-[100svh] snap-start snap-always' : ''} ${className}`}
      style={TONE_STYLE[tone]}
    >
      {children}
    </section>
  )
})

export function useSnapProgress(ref: React.RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return scrollYProgress
}

export function KineticBackdrop({
  word,
  progress,
  mode = 'scale-x',
}: {
  word: string
  progress: MotionValue<number>
  mode?: 'scale-x' | 'slide' | 'spin' | 'crush'
}) {
  const disabled = useStudioMotionDisabled()

  const scale = useTransform(progress, [0, 0.5, 1], [0.55, 1.05, 1.45])
  const x = useTransform(progress, [0, 0.5, 1], ['-18%', '0%', '22%'])
  const y = useTransform(progress, [0, 1], ['12%', '-18%'])
  const rotate = useTransform(progress, [0, 1], [-8, 6])
  const crushY = useTransform(progress, [0, 0.5, 1], [1.6, 1, 0.35])
  const crushX = useTransform(progress, [0, 0.5, 1], [0.55, 1, 1.35])
  const opacity = useTransform(progress, [0, 0.15, 0.85, 1], [0.12, 0.2, 0.2, 0.06])

  const style =
    mode === 'slide'
      ? { x, opacity }
      : mode === 'spin'
        ? { scale, rotate, opacity }
        : mode === 'crush'
          ? { scaleX: crushX, scaleY: crushY, y, opacity }
          : { scale, x, opacity }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      style={disabled ? { opacity: 0.16 } : style}
    >
      <span
        className="whitespace-nowrap font-black uppercase leading-none tracking-tighter"
        style={{
          fontFamily: 'var(--lp-heading)',
          fontSize: 'clamp(5rem, 28vw, 22rem)',
          color: 'currentColor',
        }}
      >
        {word}
      </span>
    </motion.div>
  )
}

export function KineticHeadline({
  children,
  progress,
  className = '',
}: {
  children: ReactNode
  progress: MotionValue<number>
  className?: string
}) {
  const disabled = useStudioMotionDisabled()
  const scale = useTransform(progress, [0, 0.45, 1], [0.82, 1, 1.18])
  const y = useTransform(progress, [0, 1], [40, -60])
  const rotate = useTransform(progress, [0, 1], [-2, 3])

  return (
    <motion.div
      className={`origin-left ${className}`}
      style={disabled ? undefined : { scale, y, rotate }}
    >
      {children}
    </motion.div>
  )
}

export function useMotionPanel() {
  const ref = useRef<HTMLElement>(null)
  const progress = useSnapProgress(ref)
  return { ref, progress }
}
