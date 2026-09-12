import { motion, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import type { LayoutVariant } from '../../../../pages/landing-pages/components/LayoutVariantPicker'
import { FrameInner, SnapPanel } from './SnapPanel'
import { useStudioMotionDisabled, useMotionPanel } from './motion'
import { SolidCta, type SectionProps } from './shared'
import { BODY, DISPLAY, ink } from './tokens'

// Layout (2026-09-11, redesigned 2026-09-11 per design-committee review) — a structural
// rearrangement of the same hero copy, layered onto Studio's existing frame without touching its
// scroll-choreography (clip-path wipe / rail settle / snap panel all stay exactly as they are —
// only the static width/alignment/type-scale of the copy block changes). Studio's hero has no
// inline media slot by design (the image lives in the shared ParallaxBridge behind it), so Split
// is interpreted as a wider column with real oversized display type (the bold idea kept from the
// old Editorial variant), not a literal second column.
const HERO_WIDTH_CLASS: Record<LayoutVariant, string> = {
  STACKED: 'max-w-3xl',
  SPLIT: 'max-w-4xl',
  CENTERED: 'mx-auto max-w-2xl text-center',
}

/**
 * Frame 1 — type over the shared full-bleed parallax (image lives in ParallaxBridge).
 * Clip-path wipe on the headline; body/CTA settle in after.
 */
export function HeroSection({
  content,
  editable,
  onChange,
  layoutVariant = 'STACKED',
}: SectionProps<'hero'> & { layoutVariant?: LayoutVariant }) {
  const cta = content?.primaryCta ?? {}
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()
  const isSplit = layoutVariant === 'SPLIT'
  const isCentered = layoutVariant === 'CENTERED'

  const clip = useTransform(progress, [0.1, 0.4], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const railY = useTransform(progress, [0.15, 0.5], [24, 0])
  const railOpacity = useTransform(progress, [0.15, 0.4], [0, 1])

  return (
    <SnapPanel ref={ref} tone="clear" className="flex flex-col justify-center">
      <FrameInner className="flex min-h-[calc(100svh-5rem)] flex-col justify-center">
        <div className={HERO_WIDTH_CLASS[layoutVariant]}>
          <motion.div style={disabled ? undefined : { clipPath: clip }}>
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{
                  fontFamily: 'var(--lp-heading)',
                  color: 'var(--lp-ink)',
                  // The base DISPLAY scale (studio/tokens.ts) sizes off viewport width alone, so
                  // it never shrinks for a narrower container — under Centered that overflowed
                  // its own 32rem copy box on a long headline (a real bug the committee found,
                  // not a style choice). Both overrides use a container-aware clamp instead: a
                  // bigger one for Split's wider box, a smaller one for Centered's narrower one.
                  ...(isSplit
                    ? { fontSize: 'clamp(3.5rem, 11vw, 8.5rem)' }
                    : isCentered
                      ? { fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }
                      : {}),
                }}
                className={DISPLAY}
              />
            ) : (
              <h1
                className={DISPLAY}
                style={{
                  fontFamily: 'var(--lp-heading)',
                  color: 'var(--lp-ink)',
                  // The base DISPLAY scale (studio/tokens.ts) sizes off viewport width alone, so
                  // it never shrinks for a narrower container — under Centered that overflowed
                  // its own 32rem copy box on a long headline (a real bug the committee found,
                  // not a style choice). Both overrides use a container-aware clamp instead: a
                  // bigger one for Split's wider box, a smaller one for Centered's narrower one.
                  ...(isSplit
                    ? { fontSize: 'clamp(3.5rem, 11vw, 8.5rem)' }
                    : isCentered
                      ? { fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }
                      : {}),
                }}
              >
                {content?.headline}
              </h1>
            )}
          </motion.div>

          <motion.div
            className={`mt-8 flex max-w-sm flex-col gap-6 ${isCentered ? 'mx-auto items-center' : ''}`}
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
