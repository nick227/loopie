import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { TestimonialItem } from '../../../../pages/landing-pages/components/types'
import type { SectionProps } from './shared'
import { KineticBackdrop, KineticHeadline, SnapPanel, useMotionPanel } from './SnapPanel'
import { inv } from './tokens'

export function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  const [index, setIndex] = useState(0)
  const current = items[Math.min(index, items.length - 1)]
  const { ref, progress } = useMotionPanel()

  function updateCurrent(patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === index ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="ink" className="flex flex-col justify-center text-center">
      <KineticBackdrop word="SAID" progress={progress} mode="spin" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            className="mb-12 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: inv(55) }}
          />
        ) : content?.headline ? (
          <p
            className="mb-12 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: inv(55) }}
          >
            {content.headline}
          </p>
        ) : null}

        {current ? (
          <>
            <KineticHeadline progress={progress} className="origin-center">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} quote`}
                  value={current.quote}
                  onChange={(quote) => updateCurrent({ quote })}
                  multiline
                  style={{ fontFamily: 'var(--lp-heading)' }}
                  className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-black uppercase leading-[1.05] tracking-tight"
                />
              ) : (
                <p
                  className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-black uppercase leading-[1.05] tracking-tight"
                  style={{ fontFamily: 'var(--lp-heading)' }}
                >
                  &quot;{current.quote}&quot;
                </p>
              )}
            </KineticHeadline>
            <div className="mt-8 flex items-baseline justify-center gap-2 text-sm">
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} author`}
                  value={current.author}
                  onChange={(author) => updateCurrent({ author })}
                  className="font-bold uppercase tracking-wider"
                />
              ) : (
                <span className="font-bold uppercase tracking-wider">{current.author}</span>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Testimonial ${index + 1} role`}
                  value={current.role ?? ''}
                  onChange={(role) => updateCurrent({ role })}
                  style={{ color: inv(65) }}
                />
              ) : (
                <span style={{ color: inv(65) }}>{current.role}</span>
              )}
            </div>
          </>
        ) : null}

        {items.length > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => setIndex((index - 1 + items.length) % items.length)}
              style={{ color: inv(60) }}
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
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: i === index ? 'var(--lp-bg)' : inv(30) }}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => setIndex((index + 1) % items.length)}
              style={{ color: inv(60) }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="mt-8 flex items-center justify-center gap-4">
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
      </div>
    </SnapPanel>
  )
}
