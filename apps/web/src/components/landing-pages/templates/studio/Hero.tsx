import { motion, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { SolidCta, type SectionProps } from './shared'
import { BODY, DISPLAY, ink } from './tokens'

/**
 * Frame gesture: clip-mask wipe on the headline (reads left→right as you scroll),
 * image counters with a soft vertical drift. No ghost type behind the copy.
 */
export function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()

  const clip = useTransform(progress, [0.15, 0.45], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const mediaY = useTransform(progress, [0, 1], [48, -72])
  const mediaScale = useTransform(progress, [0, 1], [1.08, 1])
  const railY = useTransform(progress, [0.2, 0.55], [24, 0])
  const railOpacity = useTransform(progress, [0.2, 0.45], [0, 1])

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center">
      <FrameInner className="grid min-h-[calc(100svh-5rem)] items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
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

        <motion.div
          className="lg:col-span-5"
          style={disabled ? undefined : { y: mediaY, scale: mediaScale }}
        >
          {editable ? (
            <div className="aspect-[4/5] w-full overflow-hidden">
              <MediaSlotField
                kind="IMAGE"
                urlMode
                fallbackUrl={media.url}
                onUrlChange={(url) => onChange({ media: { ...media, url } })}
              />
            </div>
          ) : media.url ? (
            <img
              src={media.url}
              alt={media.alt || ''}
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div className="aspect-[4/5] w-full" style={{ backgroundColor: ink(8) }} />
          )}
        </motion.div>
      </FrameInner>
    </SnapPanel>
  )
}
