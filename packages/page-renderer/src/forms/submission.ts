import { escapeHtml } from '../core/escape'
import { buildFormSubmitScript } from './runtime'
import type { RenderForm } from '../core/types'

function renderFieldHtml(field: NonNullable<RenderForm>['fields'][number]): string {
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
    return `<input type="hidden" name="${escapeHtml(field.fieldKey)}" value="${escapeHtml(field.defaultValue ?? '')}" />`
  }
  const inputType = field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'
  return `<div class="lp-field">${label}<input type="${inputType}" id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr} /></div>`
}

// Renders a Form into a real `<form>` plus its own self-contained submit script — the one place a
// published page's form fields, error/success states, and submission network call come from. Used
// identically regardless of which section actually nests it (form-embed/split-capture/
// studio-contact/webinar-widget all call this the same way).
export function renderFormHtml(
  form: RenderForm,
  submitActionUrl: string,
  sessionToken?: string,
  publishedVersionId?: string,
): string {
  if (!form) return ''

  // Which field keys are CHECKBOX type — read by the submit script so it can serialize those as
  // real booleans instead of relying on FormData's browser-default "on"/absent string semantics.
  const checkboxKeys = form.fields.filter((f) => f.type === 'CHECKBOX').map((f) => f.fieldKey)

  const fieldsHtml = form.fields.map(renderFieldHtml).join('\n')

  const successHtml = JSON.stringify(
    `<p class="lp-success">${escapeHtml(form.successMessage || "Thanks — we'll be in touch.")}</p>`,
  )

  const script = buildFormSubmitScript({
    submitActionUrl,
    checkboxKeys,
    successHtml,
    sessionToken,
    publishedVersionId,
  })

  return `<form class="lp-form-el" data-submit-url="${escapeHtml(submitActionUrl)}">
<p class="lp-error" hidden></p>
${fieldsHtml}
<button type="submit">${escapeHtml(form.submitLabel)}</button>
</form>
${script}`
}
