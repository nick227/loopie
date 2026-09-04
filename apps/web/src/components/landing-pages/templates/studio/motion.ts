import { useReducedMotion } from 'framer-motion'

export function useStudioMotionDisabled(): boolean {
  const reduced = useReducedMotion()
  const isCapture =
    typeof document !== 'undefined' && document.documentElement.hasAttribute('data-lp-capture')
  return Boolean(reduced || isCapture)
}
