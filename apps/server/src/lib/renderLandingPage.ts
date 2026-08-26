// Renders a LandingPage (or a PublishedPageVersion snapshot) to a self-contained HTML string,
// used by both the hosted /p/{slug} route and the /landing-pages/{id}/export endpoint.
//
// This is a structured, template-driven renderer — it walks LandingPageTemplate.schema.sections
// (a fixed vocabulary of section "type"s) and fills them from LandingPage.content, rather than
// interpreting arbitrary markup. That's the deliberate constraint: no freeform builder in V1.

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

type RenderFormField = {
  label: string
  fieldKey: string
  type: string
  required: boolean
  options: unknown
}

type RenderForm = { id: string; submitLabel: string; fields: RenderFormField[] } | null

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderFormHtml(form: RenderForm, submitActionUrl: string): string {
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
        const optionsHtml = options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')
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
        sessionId: params.get('sid') || null,
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

function renderSection(section: TemplateSection, content: SectionContent, formHtml: string): string {
  if (content.hidden) return ''

  switch (section.type) {
    case 'hero': {
      const headline = content.headline ? `<h1>${escapeHtml(content.headline)}</h1>` : ''
      const subheadline = content.subheadline ? `<p class="lp-subheadline">${escapeHtml(content.subheadline)}</p>` : ''
      const cta = content.ctaLabel
        ? `<a class="lp-cta" href="${escapeHtml(content.ctaLink ?? '#form')}">${escapeHtml(content.ctaLabel)}</a>`
        : ''
      return `<section class="lp-section lp-hero">${headline}${subheadline}${cta}</section>`
    }
    case 'feature-grid': {
      const items = Array.isArray(content.items) ? (content.items as { title: string; body: string }[]) : []
      const itemsHtml = items
        .map((item) => `<div class="lp-feature"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`)
        .join('')
      return `<section class="lp-section lp-features"><div class="lp-feature-grid">${itemsHtml}</div></section>`
    }
    case 'form-embed':
      return `<section class="lp-section lp-form" id="form">${formHtml}</section>`
    case 'footer':
      return `<footer class="lp-section lp-footer"><p>${escapeHtml(content.text ?? '')}</p></footer>`
    default:
      return ''
  }
}

export function renderLandingPageHtml(input: {
  pageName: string
  templateSchema: TemplateSchema
  content: PageContent
  theme: PageTheme
  form: RenderForm
  submitActionUrl: string
}): string {
  const sections = [...(input.templateSchema.sections ?? [])].sort((a, b) => a.order - b.order)
  const formHtml = renderFormHtml(input.form, input.submitActionUrl)
  const bodyHtml = sections
    .map((section) => renderSection(section, input.content.sections?.[section.key] ?? {}, formHtml))
    .join('\n')

  const theme = input.theme ?? {}
  const primaryColor = theme.primaryColor ?? '#111827'
  const backgroundColor = theme.backgroundColor ?? '#ffffff'
  const fontFamily = theme.fontFamily ?? 'system-ui, sans-serif'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.pageName)}</title>
<style>
:root { --lp-primary: ${escapeHtml(primaryColor)}; --lp-bg: ${escapeHtml(backgroundColor)}; }
body { margin: 0; font-family: ${escapeHtml(fontFamily)}; background: var(--lp-bg); color: #111827; }
.lp-section { padding: 48px 24px; max-width: 720px; margin: 0 auto; }
.lp-hero h1 { font-size: 2.25rem; margin-bottom: 0.5rem; }
.lp-subheadline { color: #4b5563; }
.lp-cta { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--lp-primary); color: white; text-decoration: none; border-radius: 8px; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
.lp-field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.lp-field-checkbox { flex-direction: row; align-items: center; }
input, textarea, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font: inherit; }
button[type="submit"] { padding: 0.75rem 1.5rem; background: var(--lp-primary); color: white; border: none; border-radius: 8px; cursor: pointer; }
.lp-footer { text-align: center; color: #6b7280; font-size: 0.875rem; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

// Every LandingPageTemplate.schema section gets a `{ hidden: false }` slot so the draft starts
// in a valid, renderable state before the author has touched anything.
export function defaultContentFromSchema(schema: TemplateSchema): PageContent {
  const sections: Record<string, SectionContent> = {}
  for (const section of schema.sections ?? []) {
    sections[section.key] = { hidden: false }
  }
  return { sections }
}
