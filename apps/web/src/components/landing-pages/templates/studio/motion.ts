import { useRef } from 'react'
import { useReducedMotion, useScroll, type MotionValue } from 'framer-motion'

export function useStudioMotionDisabled(): boolean {
  const reduced = useReducedMotion()
  const isCapture =
    typeof document !== 'undefined' && document.documentElement.hasAttribute('data-lp-capture')
  return Boolean(reduced || isCapture)
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
