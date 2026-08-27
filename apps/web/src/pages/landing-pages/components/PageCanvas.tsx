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
  formFields: FormFieldDraft[]
  submitLabel: string
  onSection: (key: string, next: SectionContent) => void
  onFormFields: (fields: FormFieldDraft[]) => void
  onSlots: (slots: AdSlotDraft[]) => void
}) {
  const backgroundColor = theme.backgroundColor ?? '#E8EEF4'
  const fontFamily = theme.fontFamily ?? '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
  const primaryColor = theme.primaryColor ?? '#0B3D91'

  return (
    <div
      className="overflow-hidden rounded-xl border border-input-border shadow-sm"
      style={{ backgroundColor, fontFamily, ['--lp-primary' as string]: primaryColor }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600&display=swap');`}</style>
      {sections.map((section) => (
        <div key={section.key}>
          {section.type === 'form-embed' ? (
            <CanvasAdBand placement="BEFORE_FORM" slots={slots} onChange={onSlots} />
          ) : null}
          <CanvasSection
            section={section}
            content={content[section.key] ?? { hidden: false }}
            onChange={(next) => onSection(section.key, next)}
            formFields={formFields}
            onFormFields={onFormFields}
            submitLabel={submitLabel}
          />
          {section.type === 'hero' ? (
            <CanvasAdBand placement="AFTER_HERO" slots={slots} onChange={onSlots} />
          ) : null}
          {section.type === 'form-embed' ? (
            <CanvasAdBand placement="AFTER_FORM" slots={slots} onChange={onSlots} />
          ) : null}
        </div>
      ))}
      <CanvasAdBand placement="BOTTOM" slots={slots} onChange={onSlots} />
    </div>
  )
}
