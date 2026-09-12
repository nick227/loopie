import { useEffect } from 'react'
import { CorporateProfessional } from '../../../components/landing-pages/templates/CorporateProfessional'
import { WebinarSignup } from '../../../components/landing-pages/templates/WebinarSignup'
import { Studio } from '../../../components/landing-pages/templates/Studio'
import { Portfolio } from '../../../components/landing-pages/templates/Portfolio'
import { Store } from '../../../components/landing-pages/templates/Store'
import { EmailOutreach } from '../../../components/landing-pages/templates/EmailOutreach'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { LAYOUT_VARIANT_CSS, GRID_TOKENS_CSS } from '@project/page-layout'
import type { LayoutVariant } from './LayoutVariantPicker'
import {
  CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  WEBINAR_SIGNUP_TEMPLATE_ID,
  STUDIO_TEMPLATE_ID,
  PORTFOLIO_TEMPLATE_ID,
  STORE_TEMPLATE_ID,
  EMAIL_OUTREACH_TEMPLATE_ID,
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
  layoutVariant,
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
  layoutVariant: LayoutVariant
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
    layoutVariant,
    editable: true as const,
    onSlotChange: onSlot,
  }
  // Same lp-template-{renderer} convention the server HTML renderer uses (renderLandingPage.ts) —
  // lets the same Studio/Portfolio compose overrides in LAYOUT_VARIANT_CSS apply here too, so the
  // editor's live canvas and the published page share one definition of what each layout looks
  // like on each Starter's skin.
  const skinClass =
    templateId === STUDIO_TEMPLATE_ID
      ? 'lp-template-studio'
      : templateId === PORTFOLIO_TEMPLATE_ID
        ? 'lp-template-portfolio'
        : templateId === CORPORATE_PROFESSIONAL_TEMPLATE_ID
          ? 'lp-template-corporate-professional'
          : templateId === STORE_TEMPLATE_ID
            ? 'lp-template-store'
            : templateId === WEBINAR_SIGNUP_TEMPLATE_ID
              ? 'lp-template-webinar-signup'
              : templateId === EMAIL_OUTREACH_TEMPLATE_ID
                ? 'lp-template-email-outreach'
                : ''
  return (
    <div
      data-lp-layout={layoutVariant.toLowerCase()}
      className={`lp-canvas overflow-hidden rounded-xl border border-input-border shadow-sm ${skinClass}`}
    >
      <style>{GRID_TOKENS_CSS}</style>
      <style>{LAYOUT_VARIANT_CSS}</style>
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
      ) : templateId === EMAIL_OUTREACH_TEMPLATE_ID ? (
        <EmailOutreach
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
