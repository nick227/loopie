import { motion, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { SolidCta, type SectionProps } from './shared'
import { BODY, DISPLAY, ink } from './tokens'

/**
 * Frame 1 — type over the shared full-bleed parallax (image lives in ParallaxBridge).
 * Clip-path wipe on the headline; body/CTA settle in after.
 */
export function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()

  const clip = useTransform(progress, [0.1, 0.4], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const railY = useTransform(progress, [0.15, 0.5], [24, 0])
  const railOpacity = useTransform(progress, [0.15, 0.4], [0, 1])

  return (
    <SnapPanel ref={ref} tone="clear" className="flex flex-col justify-center">
      <FrameInner className="flex min-h-[calc(100svh-5rem)] flex-col justify-center">
        <div className="max-w-3xl">
          <motion.div style={disabled ? undefined : { clipPath: clip }}>
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className={DISPLAY}
              />
            ) : (
              <h1
                className={DISPLAY}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h1>
            )}
          </motion.div>

          <motion.div
            className="mt-8 flex max-w-sm flex-col gap-6"
            style={disabled ? undefined : { y: railY, opacity: railOpacity }}
          >
            {editable ? (
              <CanvasText
                ariaLabel="Hero body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                placeholder="Subheadline"
                style={{ color: ink(70) }}
                className={BODY}
              />
            ) : (
              <p className={BODY} style={{ color: ink(70) }}>
                {content?.body}
              </p>
            )}

            {editable ? (
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ primaryCta: next })}
              >
                <SolidCta>
                  {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
                </SolidCta>
              </EditableLinkTrigger>
            ) : cta.label ? (
              <SolidCta href={cta.url}>
                {cta.label} <ArrowRight className="h-4 w-4" />
              </SolidCta>
            ) : null}
          </motion.div>
        </div>
      </FrameInner>
    </SnapPanel>
  )
}
