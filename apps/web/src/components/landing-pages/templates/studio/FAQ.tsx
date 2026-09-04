import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import type { FaqItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { SnapPanel } from './SnapPanel'
import { ink } from './tokens'

export function FAQSection({ content, editable, onChange }: SectionProps<'faq'>) {
  const items = content?.items ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  function updateItem(i: number, patch: Partial<FaqItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <SnapPanel tone="card" snap={false} className="py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="FAQ headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="mb-12 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase tracking-tighter"
          />
        ) : (
          <h2
            className="mb-12 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase tracking-tighter"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        <div className="divide-y" style={{ borderColor: ink(12) }}>
          {items.map((faq, i) => (
            <div key={i} className="py-6">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                {editable ? (
                  <CanvasText
                    ariaLabel={`Question ${i + 1}`}
                    value={faq.question}
                    onChange={(question) => updateItem(i, { question })}
                    className="text-lg font-bold uppercase tracking-tight"
                    style={{ color: 'var(--lp-ink)' }}
                  />
                ) : (
                  <span
                    className="text-lg font-bold uppercase tracking-tight"
                    style={{ color: 'var(--lp-ink)' }}
                  >
                    {faq.question}
                  </span>
                )}
                <Plus
                  className={`h-4 w-4 shrink-0 transition-transform ${openIndex === i ? 'rotate-45' : ''}`}
                  style={{ color: ink(45) }}
                />
              </button>
              {openIndex === i ? (
                <div className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: ink(65) }}>
                  {editable ? (
                    <CanvasText
                      ariaLabel={`Answer ${i + 1}`}
                      value={faq.answer}
                      onChange={(answer) => updateItem(i, { answer })}
                      multiline
                    />
                  ) : (
                    faq.answer
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add question"
            onClick={() =>
              onChange({ items: [...items, { question: 'New question', answer: '' }] })
            }
          />
        ) : null}
      </div>
    </SnapPanel>
  )
}
