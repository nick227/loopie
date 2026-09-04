import { motion, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import { KineticBackdrop, KineticHeadline, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import type { SectionProps } from './shared'
import { kineticWord } from './tokens'

export function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()
  const mediaY = useTransform(progress, [0, 1], [80, -120])
  const word = kineticWord(content?.headline, 'STUDIO')

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-end">
      <KineticBackdrop word={word} progress={progress} mode="crush" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-28 lg:grid-cols-12 lg:items-end lg:px-8 lg:pb-20">
        <div className="lg:col-span-8">
          <KineticHeadline progress={progress}>
            {editable ? (
              <CanvasText
                as="h1"
                ariaLabel="Hero headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                placeholder="Headline"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-[clamp(3.25rem,12vw,9rem)] font-black uppercase leading-[0.85] tracking-tighter"
              />
            ) : (
              <h1
                className="text-[clamp(3.25rem,12vw,9rem)] font-black uppercase leading-[0.85] tracking-tighter"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h1>
            )}
          </KineticHeadline>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4 lg:pb-4">
          {editable ? (
            <CanvasText
              ariaLabel="Hero body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              placeholder="Subheadline"
              style={{ color: 'var(--lp-ink)' }}
              className="max-w-sm text-base leading-relaxed opacity-75"
            />
          ) : (
            <p className="max-w-sm text-base leading-relaxed opacity-75">{content?.body}</p>
          )}

          {editable ? (
            <EditableLinkTrigger
              label={cta.label ?? ''}
              url={cta.url ?? '#contact'}
              onChange={(next) => onChange({ primaryCta: next })}
            >
              <span className="inline-flex items-center gap-2 self-start bg-[var(--lp-ink)] px-5 py-3 text-sm font-bold uppercase tracking-widest text-[var(--lp-bg)]">
                {cta.label || 'Add a call to action'} <ArrowRight className="h-4 w-4" />
              </span>
            </EditableLinkTrigger>
          ) : cta.label ? (
            <a
              href={cta.url}
              className="inline-flex items-center gap-2 self-start bg-[var(--lp-ink)] px-5 py-3 text-sm font-bold uppercase tracking-widest text-[var(--lp-bg)]"
            >
              {cta.label} <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <motion.div
        className="absolute bottom-0 right-0 z-[5] hidden w-[min(38vw,420px)] lg:block"
        style={disabled ? undefined : { y: mediaY }}
      >
        {editable ? (
          <div className="aspect-[3/4] w-full overflow-hidden">
            <MediaSlotField
              kind="IMAGE"
              urlMode
              fallbackUrl={media.url}
              onUrlChange={(url) => onChange({ media: { ...media, url } })}
            />
          </div>
        ) : media.url ? (
          <img src={media.url} alt={media.alt || ''} className="aspect-[3/4] w-full object-cover" />
        ) : null}
      </motion.div>
    </SnapPanel>
  )
}
