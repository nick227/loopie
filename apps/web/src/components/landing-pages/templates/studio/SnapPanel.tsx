import { forwardRef, type ReactNode, useRef } from 'react'
import { useScroll, type MotionValue } from 'framer-motion'
import { FRAME } from './tokens'

export type Tone = 'bg' | 'ink' | 'primary' | 'card'

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
  return <div className={`${FRAME} ${className}`}>{children}</div>
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
