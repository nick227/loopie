import { useEffect } from 'react'
import { CanvasSection } from './CanvasSection'
import { CanvasAdBand } from './CanvasAdBand'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type { AdSlotDraft } from './adSlots'
import type { SectionContent, TemplateSection } from './types'

export function PageCanvas({
  sections,
  content,
  theme,
  slots,
  hasForm,
  formFields,
  submitLabel,
  onSection,
  onFormFields,
  onSlots,
}: {
  sections: TemplateSection[]
  content: Record<string, SectionContent>
  theme: Record<string, string>
  slots: AdSlotDraft[]
  hasForm: boolean
  formFields: FormFieldDraft[]
  submitLabel: string
  onSection: (key: string, next: SectionContent) => void
  onFormFields: (fields: FormFieldDraft[]) => void
  onSlots: (slots: AdSlotDraft[]) => void
}) {
  const backgroundColor = theme.backgroundColor ?? '#E8EEF4'
  const fontFamily = theme.fontFamily ?? '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
  const headingFont = theme.headingFont ?? '"IBM Plex Serif", Georgia, serif'
  const primaryColor = theme.primaryColor ?? '#0B3D91'
  const onPrimaryColor = theme.onPrimaryColor ?? '#FFFFFF'
  const inkColor = theme.inkColor ?? '#122033'
  const cardColor = theme.cardColor ?? '#FFFFFF'
  const googleFonts =
    theme.googleFonts ?? 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600'
  const radius = theme.radius ?? '0.5rem'
  const hasBottom = slots.some((slot) => slot.placement === 'BOTTOM')

  useEffect(() => {
    if (!googleFonts) return
    const url = `https://fonts.googleapis.com/css2?${googleFonts}&display=swap`
    let link = document.querySelector(`link[href="${url}"]`) as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      document.head.appendChild(link)
    }
  }, [googleFonts])

  return (
    <div
      className="overflow-hidden rounded-xl border border-input-border shadow-sm"
      style={{
        backgroundColor,
        fontFamily,
        color: inkColor,
        ['--lp-primary' as string]: primaryColor,
        ['--lp-on-primary' as string]: onPrimaryColor,
        ['--lp-bg' as string]: backgroundColor,
        ['--lp-heading' as string]: headingFont,
        ['--lp-ink' as string]: inkColor,
        ['--lp-card' as string]: cardColor,
        ['--lp-radius' as string]: radius,
      }}
    >
      {sections.map((section) => (
        <div key={section.key}>
          {section.type === 'form-embed' ? (
            <CanvasAdBand placement="BEFORE_FORM" slots={slots} onChange={onSlots} />
          ) : null}
          <CanvasSection
            section={section}
            content={content[section.key] ?? { hidden: false }}
            onChange={(next) => onSection(section.key, next)}
            hasForm={hasForm}
            formFields={formFields}
            onFormFields={onFormFields}
            submitLabel={submitLabel}
          />
          {section.type === 'hero' ? (
            <CanvasAdBand placement="AFTER_HERO" slots={slots} onChange={onSlots} />
          ) : null}
          {section.type === 'split-capture' ||
          (section.type === 'form-embed' &&
            slots.some((slot) => slot.placement === 'AFTER_FORM')) ? (
            <CanvasAdBand placement="AFTER_FORM" slots={slots} onChange={onSlots} />
          ) : null}
        </div>
      ))}
      {hasBottom ? <CanvasAdBand placement="BOTTOM" slots={slots} onChange={onSlots} /> : null}
    </div>
  )
}
