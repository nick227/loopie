import { type ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import { useStudioMotionDisabled } from './motion'

/**
 * Full-viewport sticky parallax image behind early frames. Opacity falls to 0 as the
 * track ends — so the next snap (services intro / 3rd page) arrives as a clean solid.
 */
export function ParallaxBridge({
  imageUrl,
  imageAlt = '',
  editable,
  onImageUrl,
  children,
}: {
  imageUrl?: string
  imageAlt?: string
  editable: boolean
  onImageUrl: (url: string) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const disabled = useStudioMotionDisabled()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, [0.5, 0.92], [1, 0])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])

  return (
    <div ref={ref} className="relative">
      <div className="sticky top-0 z-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={disabled ? { opacity: 0.85 } : { opacity }}>
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt={imageAlt}
              className="absolute inset-x-0 top-[-12%] h-[124%] w-full object-cover"
              style={disabled ? undefined : { y }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--lp-ink) 8%, var(--lp-bg))' }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, color-mix(in srgb, var(--lp-bg) 88%, transparent) 0%, color-mix(in srgb, var(--lp-bg) 55%, transparent) 48%, color-mix(in srgb, var(--lp-bg) 30%, transparent) 100%)',
            }}
          />
        </motion.div>
        {editable ? (
          <div className="absolute bottom-6 right-6 z-20 w-48 overflow-hidden rounded border border-black/10 bg-white/90 shadow-sm backdrop-blur-sm">
            <MediaSlotField kind="IMAGE" urlMode fallbackUrl={imageUrl} onUrlChange={onImageUrl} />
          </div>
        ) : null}
      </div>
      <div className="relative z-10 -mt-[100svh]">{children}</div>
    </div>
  )
}
