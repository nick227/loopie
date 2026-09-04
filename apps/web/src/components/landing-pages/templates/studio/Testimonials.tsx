import { useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { TestimonialItem } from '../../../../pages/landing-pages/components/types'
import { Eyebrow, type SectionProps } from './shared'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { inv } from './tokens'

/**
 * Frame gesture: quote letter-spacing tightens from open tracking into readable
 * measure as the panel settles — kinetic type that IS the quote.
 */
export function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  const [index, setIndex] = useState(0)
  const current = items[Math.min(index, items.length - 1)]
  const { ref, progress } = useMotionPanel()
  const disabled = useStudioMotionDisabled()

  const tracking = useTransform(progress, [0.2, 0.5], ['0.12em', '-0.02em'])
  const opacity = useTransform(progress, [0.15, 0.4], [0.2, 1])

  function updateCurrent(patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === index ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="ink" className="flex flex-col justify-center">
      <FrameInner className="max-w-4xl text-left lg:mx-auto">
        {editable ? (
          <CanvasText
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            className="mb-10"
          />
        ) : content?.headline ? (
          <Eyebrow>{content.headline}</Eyebrow>
        ) : null}

        {current ? (
          <>
            <motion.div style={disabled ? undefined : { letterSpacing: tracking, opacity }}>
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} quote`}
                  value={current.quote}
                  onChange={(quote) => updateCurrent({ quote })}
                  multiline
                  style={{ fontFamily: 'var(--lp-heading)' }}
                  className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold leading-[1.2]"
                />
              ) : (
                <p
                  className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold leading-[1.2]"
                  style={{ fontFamily: 'var(--lp-heading)' }}
                >
                  &ldquo;{current.quote}&rdquo;
                </p>
              )}
            </motion.div>
            <div className="mt-8 flex items-baseline gap-2 text-sm">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} author`}
                  value={current.author}
                  onChange={(author) => updateCurrent({ author })}
                  className="font-semibold"
                />
              ) : (
                <span className="font-semibold">{current.author}</span>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} role`}
                  value={current.role ?? ''}
                  onChange={(role) => updateCurrent({ role })}
                  style={{ color: inv(60) }}
                />
              ) : (
                <span style={{ color: inv(60) }}>{current.role}</span>
              )}
            </div>
          </>
        ) : null}

        {items.length > 1 ? (
          <div className="mt-12 flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => setIndex((index - 1 + items.length) % items.length)}
              style={{ color: inv(55) }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className="h-1 w-6"
                  style={{ backgroundColor: i === index ? 'var(--lp-bg)' : inv(25) }}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => setIndex((index + 1) % items.length)}
              style={{ color: inv(55) }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="mt-8 flex items-center gap-4">
            {current ? (
              <button
                type="button"
                onClick={() => {
                  onChange({ items: items.filter((_, idx) => idx !== index) })
                  setIndex((i) => Math.max(0, i - 1))
                }}
                className="text-xs underline underline-offset-4"
                style={{ color: inv(55) }}
              >
                Remove this one
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onChange({ items: [...items, { quote: '', author: 'New client' }] })
                setIndex(items.length)
              }}
              className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
              style={{ color: inv(55) }}
            >
              <Plus className="h-3 w-3" /> Add testimonial
            </button>
          </div>
        ) : null}
      </FrameInner>
    </SnapPanel>
  )
}
