import { useEffect } from 'react'
import { CorporateProfessional } from '../../../components/landing-pages/templates/CorporateProfessional'
import { WebinarSignup } from '../../../components/landing-pages/templates/WebinarSignup'
import { Studio } from '../../../components/landing-pages/templates/Studio'
import { Portfolio } from '../../../components/landing-pages/templates/Portfolio'
import { Store } from '../../../components/landing-pages/templates/Store'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import {
  CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  WEBINAR_SIGNUP_TEMPLATE_ID,
  STUDIO_TEMPLATE_ID,
  PORTFOLIO_TEMPLATE_ID,
  STORE_TEMPLATE_ID,
  type LayoutConfig,
  type PageContent,
} from './types'

// Dispatches to whichever "rich" template's own visual component renders a given templateId —
// each one editable in place, no sidebar. All read/write the same canonical PageContent; only
// the visual component differs from PageCanvas's plainer section-registry rendering.
export function AdvancedTemplateRenderer({
  templateId,
  content,
  theme,
  layoutConfig,
  hasForm,
  formFields,
  submitLabel,
  submissionCount,
  onSlot,
  onFormFields,
}: {
  templateId: string
  content: PageContent
  theme: Record<string, string>
  layoutConfig: LayoutConfig
  hasForm: boolean
  formFields: FormFieldDraft[]
  submitLabel: string
  submissionCount?: number
  onSlot: (slotGroup: keyof PageContent, next: unknown) => void
  onFormFields: (fields: FormFieldDraft[]) => void
}) {
  // Rich canvases used to skip the font loader that PageCanvas uses. That made the editor fall
  // back to a local/system face while the self-contained published HTML loaded Google Fonts.
  const googleFonts =
    theme.googleFonts ?? 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600'
  useEffect(() => {
    if (!googleFonts) return
    const url = `https://fonts.googleapis.com/css2?${googleFonts}&display=swap`
    if (document.querySelector(`link[href="${url}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
  }, [googleFonts])

  const shared = {
    content,
    theme,
    layoutConfig,
    editable: true as const,
    onSlotChange: onSlot,
  }
  return (
    <div className="overflow-hidden rounded-xl border border-input-border shadow-sm">
      {templateId === WEBINAR_SIGNUP_TEMPLATE_ID ? (
        <WebinarSignup
          {...shared}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
          seatsFilled={submissionCount ?? 0}
        />
      ) : templateId === STUDIO_TEMPLATE_ID ? (
        <Studio
          {...shared}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
        />
      ) : templateId === CORPORATE_PROFESSIONAL_TEMPLATE_ID ? (
        <CorporateProfessional
          {...shared}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
        />
      ) : templateId === PORTFOLIO_TEMPLATE_ID ? (
        <Portfolio
          {...shared}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
        />
      ) : templateId === STORE_TEMPLATE_ID ? (
        <Store
          {...shared}
          hasForm={hasForm}
          formFields={formFields}
          onFormFields={onFormFields}
          submitLabel={submitLabel}
        />
      ) : null}
    </div>
  )
}
