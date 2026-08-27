// Renders a LandingPage (or a PublishedPageVersion snapshot) to a self-contained HTML string,
// used by both the hosted /p/{slug} route and the /landing-pages/{id}/export endpoint.
//
// This is a structured, template-driven renderer — it walks LandingPageTemplate.schema.sections
// (a fixed vocabulary of section "type"s) and fills them from LandingPage.content, rather than
// interpreting arbitrary markup. That's the deliberate constraint: no freeform builder in V1.

import { defaultContentFromSchema } from '@project/db'
import { escapeHtml, renderBody, type RenderForm } from './renderLandingPageSections'

type TemplateSection = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

type TemplateSchema = {
  sections?: TemplateSection[]
  themeTokens?: string[]
}

type SectionContent = Record<string, unknown> & { hidden?: boolean }
type PageContent = { sections?: Record<string, SectionContent> }
type PageTheme = Record<string, string> | null | undefined

export { defaultContentFromSchema }

function renderFormHtml(form: RenderForm, submitActionUrl: string, sessionToken?: string): string {
  if (!form) return ''

  const fieldsHtml = form.fields
    .map((field) => {
      const requiredAttr = field.required ? 'required' : ''
      const fieldId = `lp-field-${escapeHtml(field.fieldKey)}`
      const label = `<label for="${fieldId}">${escapeHtml(field.label)}</label>`

      if (field.type === 'TEXTAREA') {
        return `<div class="lp-field">${label}<textarea id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr}></textarea></div>`
      }
      if (field.type === 'SELECT') {
        const options = Array.isArray(field.options) ? (field.options as string[]) : []
        const optionsHtml = options
          .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
          .join('')
        return `<div class="lp-field">${label}<select id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr}>${optionsHtml}</select></div>`
      }
      if (field.type === 'CHECKBOX') {
        return `<div class="lp-field lp-field-checkbox"><input type="checkbox" id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr} />${label}</div>`
      }
      if (field.type === 'HIDDEN') {
        return `<input type="hidden" name="${escapeHtml(field.fieldKey)}" />`
      }
      const inputType = field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'
      return `<div class="lp-field">${label}<input type="${inputType}" id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr} /></div>`
    })
    .join('\n')

  const issuedSid = sessionToken ? JSON.stringify(sessionToken) : 'null'

  return `<form class="lp-form-el" data-submit-url="${escapeHtml(submitActionUrl)}">
${fieldsHtml}
<button type="submit">${escapeHtml(form.submitLabel)}</button>
</form>
<script>
(function () {
  var formEl = document.currentScript.previousElementSibling;
  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = {};
    new FormData(formEl).forEach(function (value, key) { data[key] = value; });
    var params = new URLSearchParams(window.location.search);
    fetch(formEl.getAttribute('data-submit-url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: params.get('sid') || ${issuedSid},
        data: data,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmContent: params.get('utm_content') || undefined,
        utmTerm: params.get('utm_term') || undefined,
      }),
    }).then(function () { formEl.outerHTML = '<p class="lp-success">Thanks!</p>'; });
  });
})();
</script>`
}

export function renderLandingPageHtml(input: {
  pageName: string
  templateSchema: TemplateSchema
  content: PageContent
  theme: PageTheme
  form: RenderForm
  submitActionUrl: string
  sessionToken?: string
  adSlots?: { placement: string; embedUrl: string | null }[]
}): string {
  const sections = [...(input.templateSchema.sections ?? [])].sort((a, b) => a.order - b.order)
  const formHtml = renderFormHtml(input.form, input.submitActionUrl, input.sessionToken)
  const bodyHtml = renderBody(
    sections,
    input.content,
    formHtml,
    input.adSlots ?? [],
    input.sessionToken,
  )

  const theme = input.theme ?? {}
  const primaryColor = theme.primaryColor ?? '#0B3D91'
  const backgroundColor = theme.backgroundColor ?? '#E8EEF4'
  const inkColor = theme.inkColor ?? '#122033'
  const cardColor = theme.cardColor ?? '#FFFFFF'
  const fontFamily = theme.fontFamily ?? '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
  const headingFont = theme.headingFont ?? '"IBM Plex Serif", Georgia, serif'
  const googleFonts =
    theme.googleFonts ?? 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.pageName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?${escapeHtml(googleFonts)}&display=swap" rel="stylesheet" />
<style>
:root { --lp-primary: ${escapeHtml(primaryColor)}; --lp-bg: ${escapeHtml(backgroundColor)}; --lp-ink: ${escapeHtml(inkColor)}; --lp-card: ${escapeHtml(cardColor)}; --lp-heading: ${escapeHtml(headingFont)}; }
body { margin: 0; font-family: ${escapeHtml(fontFamily)}; background: var(--lp-bg); color: var(--lp-ink); }
.lp-section { padding: 56px 28px; max-width: 1040px; margin: 0 auto; }
.lp-kicker { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lp-primary); }
.lp-hero h1 { font-family: var(--lp-heading); font-size: clamp(2.1rem, 4vw, 3.15rem); line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 1rem; font-weight: 600; }
.lp-subheadline { color: var(--lp-ink); opacity: 0.72; font-size: 1.05rem; line-height: 1.55; max-width: 36rem; margin: 0; }
.lp-cta { display: inline-block; margin-top: 1.5rem; padding: 0.8rem 1.4rem; background: var(--lp-primary); color: white; text-decoration: none; border-radius: 6px; font-size: 0.92rem; font-weight: 500; letter-spacing: 0.02em; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; overflow: hidden; }
.lp-feature { background: var(--lp-card); padding: 1.35rem 1.25rem; }
.lp-feature h3 { margin: 0 0 0.4rem; font-size: 1rem; }
.lp-feature p { margin: 0; opacity: 0.72; font-size: 0.9rem; line-height: 1.45; }
.lp-form-card { background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; padding: 1.75rem; }
.lp-form-title { font-family: var(--lp-heading); font-size: 1.35rem; margin: 0 0 1.1rem; }
.lp-field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.lp-field-checkbox { flex-direction: row; align-items: center; }
input, textarea, select { padding: 0.55rem 0.65rem; border: 1px solid color-mix(in srgb, var(--lp-ink) 18%, var(--lp-card)); border-radius: 6px; font: inherit; background: var(--lp-card); color: var(--lp-ink); }
button[type="submit"] { padding: 0.8rem 1.4rem; background: var(--lp-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font: inherit; font-weight: 500; }
.lp-footer { text-align: center; opacity: 0.65; font-size: 0.875rem; }
.lp-ad iframe { width: 100%; min-height: 280px; border: 0; display: block; }
.lp-media img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; display: block; box-shadow: 0 12px 40px rgba(18, 32, 51, 0.12); }
.lp-media audio { width: 100%; }
.lp-media iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 4px; display: block; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
