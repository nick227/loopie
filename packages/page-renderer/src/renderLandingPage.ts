// Renders a LandingPage (or a PublishedPageVersion snapshot) to a self-contained HTML string,
// used by both the hosted /p/{slug} route and the /landing-pages/{id}/export endpoint.
//
// This is a structured, template-driven renderer — it walks LandingPageTemplate.schema.sections
// (a fixed vocabulary of section "type"s) and fills them from LandingPage.content, rather than
// interpreting arbitrary markup. That's the deliberate constraint: no freeform builder in V1.

import {
  DEFAULT_PAGE_FAVICON_URL,
  normalizeLegacyPageContent,
  type PageContent,
  type LayoutConfig,
} from '@project/db'
import { escapeHtml, renderBody, type RenderForm } from './renderLandingPageSections'

type TemplateSection = {
  key?: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

type TemplateSchema = {
  renderer?: 'standard' | 'corporate-professional' | 'webinar-signup' | 'studio'
  sections?: TemplateSection[]
  themeTokens?: string[]
}

type PageTheme = Record<string, string> | null | undefined

function renderFormHtml(
  form: RenderForm,
  submitActionUrl: string,
  sessionToken?: string,
  publishedVersionId?: string,
): string {
  if (!form) return ''

  // Which field keys are CHECKBOX type — read by the submit script so it can serialize those as
  // real booleans instead of relying on FormData's browser-default "on"/absent string semantics.
  const checkboxKeys = form.fields.filter((f) => f.type === 'CHECKBOX').map((f) => f.fieldKey)

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
        return `<input type="hidden" name="${escapeHtml(field.fieldKey)}" value="${escapeHtml(field.defaultValue ?? '')}" />`
      }
      const inputType = field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'
      return `<div class="lp-field">${label}<input type="${inputType}" id="${fieldId}" name="${escapeHtml(field.fieldKey)}" ${requiredAttr} /></div>`
    })
    .join('\n')

  const successHtml = JSON.stringify(
    `<p class="lp-success">${escapeHtml(form.successMessage || "Thanks — we'll be in touch.")}</p>`,
  )
  const issuedSid = sessionToken ? JSON.stringify(sessionToken) : 'null'
  const pvid = publishedVersionId ? JSON.stringify(publishedVersionId) : 'null'
  const checkboxKeysJson = JSON.stringify(checkboxKeys)

  return `<form class="lp-form-el" data-submit-url="${escapeHtml(submitActionUrl)}">
<p class="lp-error" hidden></p>
${fieldsHtml}
<button type="submit">${escapeHtml(form.submitLabel)}</button>
</form>
<script>
(function () {
  var formEl = document.currentScript.previousElementSibling;
  var errorEl = formEl.querySelector('.lp-error');
  var checkboxKeys = ${checkboxKeysJson};
  // Generated once per page load (not per submit attempt) so a retry after a transient failure
  // reuses the same key and dedupes server-side instead of creating a second submission — see
  // SubmitLandingPageFormInput's required idempotencyKey.
  function uuidFallback() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  var idempotencyKey =
    window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : uuidFallback();
  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    errorEl.hidden = true;
    var data = {};
    new FormData(formEl).forEach(function (value, key) {
      if (checkboxKeys.indexOf(key) === -1) data[key] = value;
    });
    // Checkboxes: read .checked directly rather than FormData's "on"/absent string convention, so
    // the server always receives a real boolean for these fields (present or not, checked or not).
    checkboxKeys.forEach(function (key) {
      var input = formEl.querySelector('[name="' + key + '"]');
      data[key] = !!(input && input.checked);
    });
    var params = new URLSearchParams(window.location.search);
    fetch(formEl.getAttribute('data-submit-url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: (window.Loopie && window.Loopie.session && window.Loopie.session.token) || params.get('sid') || ${issuedSid},
        idempotencyKey: idempotencyKey,
        publishedVersionId: ${pvid},
        data: data,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmContent: params.get('utm_content') || undefined,
        utmTerm: params.get('utm_term') || undefined,
      }),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || body.message || 'Could not submit');
        formEl.outerHTML = ${successHtml};
      });
    }).catch(function (err) {
      errorEl.textContent = err.message || 'Could not submit';
      errorEl.hidden = false;
    });
  });
})();
</script>`
}

export function renderLandingPageHtml(input: {
  pageName: string
  templateSchema: TemplateSchema
  // Accepts either canonical or legacy (pre-migration) content — normalized internally via
  // normalizeLegacyPageContent, so callers never need to normalize before calling this.
  content: unknown
  theme: PageTheme
  layoutConfig?: LayoutConfig | null
  form: RenderForm
  submitActionUrl: string
  sessionToken?: string
  // The PublishedPageVersion this HTML is actually being rendered from, when known — embedded
  // into the submit script so a later republish can't invalidate (or misvalidate) a submission
  // that's still in flight against this exact render. Omitted for draft preview/export, which has
  // no PublishedPageVersion; the submit endpoint falls back to the page's current version then.
  publishedVersionId?: string
  adSlots?: { placement: string; embedUrls: string[] }[]
  runtimeScriptUrl?: string
  businessId?: string
  // Real count of this page's own FormSubmission rows — computed fresh by the caller on every
  // request (no polling, no seeded/fake baseline; see CLAUDE.md's webinar-widget note). Only
  // consumed by the 'webinar-widget' section type today.
  submissionCount?: number
  injectedHeadScripts?: string
}): string {
  const sections = [...(input.templateSchema.sections ?? [])].sort((a, b) => a.order - b.order)
  const formHtml = renderFormHtml(
    input.form,
    input.submitActionUrl,
    input.sessionToken,
    input.publishedVersionId,
  )
  const content = normalizeLegacyPageContent(input.content)
  const pageTitle = content.browser?.title?.trim() || input.pageName
  const faviconUrl = content.browser?.faviconUrl?.trim() ?? DEFAULT_PAGE_FAVICON_URL
  const faviconHtml = faviconUrl ? `<link rel="icon" href="${escapeHtml(faviconUrl)}" />\n` : ''
  const bodyHtml = renderBody(
    sections,
    content,
    input.layoutConfig,
    formHtml,
    input.adSlots ?? [],
    input.sessionToken,
    input.submissionCount ?? 0,
  )
  const renderer = input.templateSchema.renderer ?? 'standard'

  const theme = input.theme ?? {}
  const primaryColor = theme.primaryColor ?? '#0B3D91'
  const onPrimaryColor = theme.onPrimaryColor ?? '#FFFFFF'
  const backgroundColor = theme.backgroundColor ?? '#E8EEF4'
  const inkColor = theme.inkColor ?? '#122033'
  const cardColor = theme.cardColor ?? '#FFFFFF'
  const fontFamily = theme.fontFamily ?? '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
  const headingFont = theme.headingFont ?? '"IBM Plex Serif", Georgia, serif'
  const googleFonts =
    theme.googleFonts ?? 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600'
  const radius = theme.radius ?? '0.5rem'

  const runtime =
    input.runtimeScriptUrl && input.businessId
      ? `<script src="${escapeHtml(input.runtimeScriptUrl)}" data-business="${escapeHtml(input.businessId)}"></script>`
      : ''

  // Purely local Date math — no fetch, no polling, matches the "accurate on load" decision.
  // A no-op on any page without a webinar widget (querySelectorAll returns an empty list).
  const webinarScript = `<script>
(function () {
  document.querySelectorAll('[data-lp-event-date]').forEach(function (el) {
    var d = new Date(el.getAttribute('data-lp-event-date'));
    if (isNaN(d.getTime())) return;
    el.textContent = d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  });
  var timers = [];
  document.querySelectorAll('[data-lp-countdown-for]').forEach(function (el) {
    var target = new Date(el.getAttribute('data-lp-countdown-for')).getTime();
    if (isNaN(target)) return;
    function render() {
      var diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'This event has started'; return false; }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);
      function unit(v, label) { return '<span><span class="lp-cd-value">' + String(v).padStart(2, '0') + '</span><span class="lp-cd-label">' + label + '</span></span>'; }
      el.innerHTML = unit(days, 'Days') + unit(hours, 'Hrs') + unit(minutes, 'Min') + unit(seconds, 'Sec');
      return true;
    }
    if (render()) timers.push(setInterval(render, 1000));
  });
})();
</script>`

  // Plain click-to-enlarge, no library — a no-op on any page without a gallery.
  const galleryScript = `<script>
(function () {
  var tiles = document.querySelectorAll('[data-lp-lightbox-src]');
  if (!tiles.length) return;
  var items = Array.prototype.map.call(tiles, function (el) {
    return { src: el.getAttribute('data-lp-lightbox-src'), caption: el.getAttribute('data-lp-lightbox-caption') || '' };
  });
  var box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function open(index) {
    close();
    var item = items[index];
    box = document.createElement('div');
    box.className = 'lp-lightbox';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lp-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\\u00d7';
    closeBtn.addEventListener('click', close);
    var img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    box.appendChild(closeBtn);
    box.appendChild(img);
    if (item.caption) {
      var caption = document.createElement('figcaption');
      caption.textContent = item.caption;
      box.appendChild(caption);
    }
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.body.appendChild(box);
  }
  tiles.forEach(function (el, i) { el.addEventListener('click', function () { open(i); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
</script>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pageTitle)}</title>
${faviconHtml}<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?${escapeHtml(googleFonts)}&display=swap" rel="stylesheet" />
<style>
:root { --lp-primary: ${escapeHtml(primaryColor)}; --lp-on-primary: ${escapeHtml(onPrimaryColor)}; --lp-bg: ${escapeHtml(backgroundColor)}; --lp-ink: ${escapeHtml(inkColor)}; --lp-card: ${escapeHtml(cardColor)}; --lp-heading: ${escapeHtml(headingFont)}; --lp-radius: ${escapeHtml(radius)}; }
* { box-sizing: border-box; }
body { margin: 0; font-family: ${escapeHtml(fontFamily)}; background: var(--lp-bg); color: var(--lp-ink); }
a { color: inherit; }
img { max-width: 100%; }
.lp-section { padding: 56px 28px; max-width: 1040px; margin: 0 auto; }
.lp-nav { min-height: 76px; max-width: 1280px; margin: 0 auto; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
.lp-brand { font-family: var(--lp-heading); font-size: 1.35rem; font-weight: 800; text-decoration: none; }
.lp-nav-links { display: flex; align-items: center; gap: 1.75rem; }
.lp-nav-links a { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 0.875rem; font-weight: 600; text-decoration: none; }
.lp-kicker { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lp-primary); }
.lp-hero-eyebrow, .lp-hero-badge { display: inline-block; margin: 0 0 1.25rem; padding: 0.4rem 0.9rem; border-radius: 999px; background: color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.lp-hero h1 { font-family: var(--lp-heading); font-size: clamp(2.1rem, 4vw, 3.15rem); line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 1rem; font-weight: 600; }
.lp-subheadline { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 1.05rem; line-height: 1.55; max-width: 36rem; margin: 0; }
.lp-hero-media { margin-top: 2rem; }
.lp-hero-media img { width: 100%; display: block; object-fit: cover; border-radius: calc(var(--lp-radius) * 2); }
.lp-cta { display: inline-block; margin-top: 1.5rem; padding: 0.8rem 1.4rem; background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; border-radius: var(--lp-radius); font-size: 0.92rem; font-weight: 500; letter-spacing: 0.02em; }
.lp-section-heading { max-width: 42rem; margin: 0 auto 2.5rem; text-align: center; }
.lp-section-heading h2, .lp-footer h2, .lp-services > .lp-section-heading h2, .lp-gallery > h2 { font-family: var(--lp-heading); font-size: clamp(1.9rem, 4vw, 3rem); line-height: 1.12; letter-spacing: -0.025em; margin: 0 0 0.8rem; }
.lp-section-intro, .lp-section-heading > p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); line-height: 1.65; margin: 0; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; overflow: hidden; }
.lp-feature { background: var(--lp-card); padding: 1.35rem 1.25rem; }
.lp-feature h3 { margin: 0 0 0.4rem; font-size: 1rem; }
.lp-feature p { margin: 0; color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 0.9rem; line-height: 1.45; }
.lp-form-card { background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; padding: 1.75rem; }
.lp-form-title { font-family: var(--lp-heading); font-size: 1.35rem; margin: 0 0 1.1rem; }
.lp-field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.lp-field-checkbox { flex-direction: row; align-items: center; }
input, textarea, select { padding: 0.55rem 0.65rem; border: 1px solid color-mix(in srgb, var(--lp-ink) 18%, var(--lp-card)); border-radius: 6px; font: inherit; background: var(--lp-bg); color: var(--lp-ink); }
button[type="submit"] { padding: 0.8rem 1.4rem; background: var(--lp-primary); color: var(--lp-on-primary); border: none; border-radius: 6px; cursor: pointer; font: inherit; font-weight: 500; }
.lp-footer { text-align: center; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); font-size: 0.875rem; }
.lp-ad { padding: 16px 28px; max-width: 1040px; margin: 0 auto; }
.lp-ad iframe { width: 100%; min-height: 90px; max-height: 120px; border: 0; display: block; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); }
.lp-media img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; display: block; }
.lp-media audio { width: 100%; }
.lp-media iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 4px; display: block; }
.lp-split { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
.lp-split-media { min-height: 280px; background: color-mix(in srgb, var(--lp-ink) 8%, var(--lp-bg)); }
.lp-split-media img { width: 100%; height: 100%; min-height: 280px; object-fit: cover; display: block; }
.lp-split-copy { display: flex; flex-direction: column; justify-content: center; padding: 48px 40px; background: var(--lp-card); color: var(--lp-ink); }
.lp-split-copy h1 { font-family: var(--lp-heading); font-size: clamp(1.55rem, 3vw, 2.15rem); line-height: 1.2; margin: 0 0 1.4rem; font-weight: 600; }
.lp-split .lp-form-el { max-width: 22rem; }
.lp-error { color: color-mix(in srgb, #e11d48 55%, var(--lp-ink)); font-size: 0.875rem; margin: 0 0 0.75rem; }
.lp-success { color: var(--lp-ink); font-size: 1rem; }
.lp-logo-row { display: flex; flex-wrap: wrap; gap: 2rem; align-items: center; }
.lp-service-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.lp-service { overflow: hidden; background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: calc(var(--lp-radius) * 2); }
.lp-service-copy { padding: 1.5rem; }
.lp-service h3, .lp-service h4 { margin: 0 0 0.6rem; }
.lp-service p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); line-height: 1.55; }
.lp-service img { width: 100%; aspect-ratio: 4 / 3; display: block; object-fit: cover; }
.lp-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.5rem; text-align: center; }
.lp-metric-value { display: block; font-size: 2rem; font-weight: 700; }
.lp-metric-label { display: block; font-size: 0.875rem; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); }
.lp-comparison table { width: 100%; border-collapse: collapse; }
.lp-comparison td { padding: 0.75rem; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-testimonial-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.lp-testimonial { margin: 0; padding: 1.25rem; background: var(--lp-card); border-radius: 8px; }
.lp-faq-item { padding: 0.75rem 0; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-webinar { display: grid; gap: 1.5rem; grid-template-columns: 1fr 1fr; }
.lp-webinar-meta { background: color-mix(in srgb, var(--lp-ink) 92%, var(--lp-bg)); color: var(--lp-bg); border-radius: 12px; padding: 1.75rem; }
.lp-webinar-countdown { display: flex; gap: 1.25rem; margin-bottom: 1.25rem; font-variant-numeric: tabular-nums; }
.lp-webinar-countdown span { display: block; text-align: center; }
.lp-webinar-countdown .lp-cd-value { font-size: 1.75rem; font-weight: 800; }
.lp-webinar-countdown .lp-cd-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: color-mix(in srgb, var(--lp-bg) 60%, var(--lp-ink)); }
.lp-webinar-date, .lp-webinar-duration { display: block; margin: 0 0 0.35rem; font-size: 0.925rem; }
.lp-webinar-seats { margin-top: 1.25rem; }
.lp-webinar-seats-count { margin: 0 0 0.4rem; font-size: 0.875rem; font-weight: 600; }
.lp-webinar-bar { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--lp-bg) 15%, var(--lp-ink)); overflow: hidden; }
.lp-webinar-bar-fill { height: 100%; background: var(--lp-primary); border-radius: 999px; }
.lp-webinar-host { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid color-mix(in srgb, var(--lp-bg) 15%, var(--lp-ink)); }
.lp-webinar-host img { width: 44px; height: 44px; border-radius: 999px; object-fit: cover; }
.lp-webinar-host-name { margin: 0; font-weight: 600; font-size: 0.9rem; }
.lp-webinar-host-title { margin: 0; font-size: 0.8rem; color: color-mix(in srgb, var(--lp-bg) 60%, var(--lp-ink)); }
.lp-webinar-host-bio { margin: 0.5rem 0 0; font-size: 0.825rem; color: color-mix(in srgb, var(--lp-bg) 65%, var(--lp-ink)); }
.lp-webinar-form .lp-form-card { height: 100%; box-sizing: border-box; }
.lp-studio-contact { display: grid; gap: 2rem; grid-template-columns: 1fr 1fr; background: color-mix(in srgb, var(--lp-ink) 92%, var(--lp-bg)); color: var(--lp-bg); border-radius: 0; }
.lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.75rem, 3vw, 2.5rem); margin: 0 0 0.75rem; }
.lp-studio-contact p { color: color-mix(in srgb, var(--lp-bg) 70%, var(--lp-ink)); margin: 0; }
.lp-studio-contact .lp-form-card { background: transparent; border: none; padding: 0; }
.lp-studio-contact input, .lp-studio-contact select { border: none; border-bottom: 1px solid color-mix(in srgb, var(--lp-bg) 25%, var(--lp-ink)); border-radius: 0; background: transparent; color: var(--lp-bg); padding-left: 0; }
.lp-studio-contact button[type="submit"] { background: transparent; color: var(--lp-bg); border: 1px solid color-mix(in srgb, var(--lp-bg) 35%, var(--lp-ink)); border-radius: 999px; }
.lp-gallery-grid { columns: 2; column-gap: 0.75rem; }
.lp-gallery-tile { margin: 0 0 0.75rem; break-inside: avoid; cursor: zoom-in; }
.lp-gallery-tile img { width: 100%; display: block; }
.lp-gallery-tile figcaption { display: none; }
.lp-lightbox { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: rgba(0,0,0,0.92); padding: 1.5rem; }
.lp-lightbox img { max-height: 80vh; max-width: 92vw; object-fit: contain; }
.lp-lightbox figcaption { color: rgba(255,255,255,0.7); font-size: 0.875rem; max-width: 32rem; text-align: center; }
.lp-lightbox-close { position: absolute; top: 1.25rem; right: 1.25rem; color: rgba(255,255,255,0.7); background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.lp-team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.75rem; }
.lp-team-member { text-align: center; }
.lp-team-member img, .lp-team-photo-empty { width: 128px; height: 128px; object-fit: cover; border-radius: 999px; display: block; margin: 0 auto 1rem; background: color-mix(in srgb, var(--lp-ink) 8%, var(--lp-bg)); }
.lp-team-member h3 { margin: 0 0 0.2rem; font-size: 1.05rem; }
.lp-team-role { margin: 0 0 0.5rem; font-size: 0.825rem; color: color-mix(in srgb, var(--lp-ink) 60%, var(--lp-bg)); }
.lp-team-bio { margin: 0; font-size: 0.875rem; line-height: 1.5; color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); }
.lp-product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
.lp-product { position: relative; }
.lp-product-media, .lp-product-media-empty { aspect-ratio: 4 / 5; border-radius: var(--lp-radius); overflow: hidden; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); margin-bottom: 0.9rem; }
.lp-product-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-product-badge { position: absolute; top: 0.75rem; left: 0.75rem; z-index: 1; padding: 0.3rem 0.65rem; border-radius: 999px; background: var(--lp-primary); color: var(--lp-on-primary); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.lp-product h3 { margin: 0 0 0.25rem; font-size: 1rem; }
.lp-product-price { margin: 0 0 0.6rem; font-weight: 700; }
.lp-product .lp-cta { margin-top: 0; padding: 0.5rem 1rem; font-size: 0.825rem; }
.lp-category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.lp-category-tile { position: relative; display: block; aspect-ratio: 1 / 1; border-radius: var(--lp-radius); overflow: hidden; text-decoration: none; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); }
.lp-category-tile img, .lp-category-media-empty { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-category-label { position: absolute; inset: auto 0 0 0; padding: 1rem; background: linear-gradient(to top, rgba(0,0,0,.55), transparent); color: #fff; font-weight: 700; font-size: 0.95rem; }
.lp-story { display: grid; gap: 2.5rem; grid-template-columns: 1fr 1fr; align-items: center; }
.lp-story-media img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: calc(var(--lp-radius) * 2); display: block; }
.lp-story-copy h2 { font-family: var(--lp-heading); font-size: clamp(1.9rem, 4vw, 2.75rem); margin: 0 0 0.9rem; }
.lp-story-copy p { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); line-height: 1.65; margin: 0; }

/* Rich-template parity. The editor and published document share the renderer identity stored in
   the template schema; these rules mirror the layout vocabulary of the editable React canvases. */
.lp-template-corporate-professional .lp-nav { position: relative; z-index: 2; min-height: 88px; }
.lp-template-corporate-professional .lp-hero { max-width: 1280px; padding-top: 96px; padding-bottom: 112px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 64px; }
.lp-template-corporate-professional .lp-hero h1 { font-size: clamp(3rem, 6vw, 4.5rem); font-weight: 800; }
.lp-template-corporate-professional .lp-hero-media { margin: 0; }
.lp-template-corporate-professional .lp-hero-media img { aspect-ratio: 4 / 3; box-shadow: 0 28px 60px -28px rgba(0,0,0,.4); }
.lp-template-corporate-professional .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); text-align: center; }
.lp-template-corporate-professional .lp-logo-row { max-width: 1180px; margin: 0 auto; justify-content: space-around; font-size: 1.15rem; font-weight: 800; opacity: .65; }
.lp-template-corporate-professional .lp-services, .lp-template-corporate-professional .lp-features, .lp-template-corporate-professional .lp-comparison, .lp-template-corporate-professional .lp-testimonials, .lp-template-corporate-professional .lp-faq { max-width: 1180px; padding-block: 96px; }
.lp-template-corporate-professional .lp-service-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-corporate-professional .lp-metrics { max-width: none; padding: 72px max(28px, calc((100vw - 1120px) / 2)); background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-corporate-professional .lp-metric-value { font-size: clamp(2.5rem, 5vw, 4rem); }
.lp-template-corporate-professional .lp-metric-label { color: color-mix(in srgb, var(--lp-on-primary) 75%, var(--lp-primary)); }
.lp-template-corporate-professional .lp-metric p { line-height: 1.5; color: color-mix(in srgb, var(--lp-on-primary) 70%, var(--lp-primary)); }
.lp-template-corporate-professional .lp-feature-grid { gap: 1.5rem; border: 0; background: transparent; }
.lp-template-corporate-professional .lp-feature { padding: 2rem; border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: calc(var(--lp-radius) * 2); }
.lp-template-corporate-professional .lp-footer { max-width: none; padding-block: 100px; background: color-mix(in srgb, var(--lp-ink) 94%, var(--lp-bg)); color: var(--lp-bg); }

.lp-template-webinar-signup .lp-hero { max-width: none; padding: 96px max(28px, calc((100vw - 960px) / 2)) 112px; text-align: center; background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-webinar-signup .lp-hero h1 { font-size: clamp(2.6rem, 6vw, 4.5rem); font-weight: 800; }
.lp-template-webinar-signup .lp-hero .lp-subheadline { max-width: 44rem; margin-inline: auto; color: color-mix(in srgb, var(--lp-bg) 75%, var(--lp-ink)); }
.lp-template-webinar-signup .lp-hero-eyebrow { background: color-mix(in srgb, var(--lp-bg) 15%, var(--lp-ink)); }
.lp-template-webinar-signup .lp-hero-media { max-width: 896px; margin: 64px auto 0; }
.lp-template-webinar-signup .lp-hero-media img { box-shadow: 0 28px 70px -28px rgba(0,0,0,.8); }
.lp-template-webinar-signup .lp-webinar { max-width: none; padding: 80px max(28px, calc((100vw - 1120px) / 2)); background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-webinar-signup .lp-webinar-meta { border: 1px solid color-mix(in srgb, var(--lp-bg) 18%, var(--lp-ink)); border-radius: calc(var(--lp-radius) * 3); padding: 2rem; }
.lp-template-webinar-signup .lp-webinar-form .lp-form-card { border-radius: calc(var(--lp-radius) * 3); padding: 2rem; color: var(--lp-ink); }
.lp-template-webinar-signup .lp-features, .lp-template-webinar-signup .lp-testimonials, .lp-template-webinar-signup .lp-faq { max-width: 1024px; padding-block: 96px; }
.lp-template-webinar-signup .lp-feature-grid { gap: 1.5rem; border: 0; background: transparent; }
.lp-template-webinar-signup .lp-feature { border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: calc(var(--lp-radius) * 2); }
.lp-template-webinar-signup .lp-footer { max-width: none; padding-block: 80px; border-top: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }

.lp-template-studio .lp-nav { max-width: 1152px; min-height: 88px; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-template-studio .lp-nav-links a:not(:first-child) { display: none; }
.lp-template-studio .lp-nav-links a { text-decoration: underline; text-underline-offset: 4px; }
.lp-template-studio .lp-hero { max-width: 1152px; padding-block: 80px; display: grid; grid-template-columns: 1.15fr .85fr; gap: 64px; align-items: end; }
.lp-template-studio .lp-hero h1 { font-size: clamp(3.5rem, 8vw, 6.5rem); line-height: .95; font-weight: 700; }
.lp-template-studio .lp-hero-media { margin: 0; }
.lp-template-studio .lp-hero-media img { aspect-ratio: 3 / 4; border-radius: 0; }
.lp-template-studio .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-template-studio .lp-logo-row { flex-wrap: nowrap; justify-content: space-around; font-family: var(--lp-heading); font-size: 1.2rem; }
.lp-template-studio .lp-metrics { max-width: 1152px; padding-block: 96px; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); text-align: left; }
.lp-template-studio .lp-metric-value { font-family: var(--lp-heading); font-size: clamp(3.5rem, 7vw, 6rem); line-height: 1; }
.lp-template-studio .lp-features, .lp-template-studio .lp-services, .lp-template-studio .lp-gallery, .lp-template-studio .lp-testimonials, .lp-template-studio .lp-faq { max-width: 1152px; padding-block: 96px; border-top: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-template-studio .lp-section-heading { margin-left: 0; text-align: left; }
.lp-template-studio .lp-feature-grid { display: block; border: 0; background: transparent; border-radius: 0; }
.lp-template-studio .lp-feature { display: grid; grid-template-columns: .45fr 1fr; gap: 2rem; padding: 2rem 0; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); background: transparent; }
.lp-template-studio .lp-service-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-studio .lp-service { border-radius: 0; border: 0; background: transparent; }
.lp-template-studio .lp-service-copy { padding: 1rem 0; }
.lp-template-studio .lp-service img { border-radius: 0; }
.lp-template-studio .lp-gallery-grid { columns: 3; }
.lp-template-studio .lp-testimonial { padding: 0; background: transparent; border-radius: 0; font-family: var(--lp-heading); font-size: 1.4rem; }
.lp-template-studio .lp-studio-contact { max-width: none; padding: 112px max(28px, calc((100vw - 1152px) / 2)); }
.lp-template-studio .lp-team { max-width: 1152px; padding-block: 96px; border-top: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-template-studio .lp-section-heading + .lp-team-grid { margin-top: 0; }
.lp-template-studio .lp-team-grid { grid-template-columns: repeat(4, 1fr); gap: 2.5rem 1.5rem; }
.lp-template-studio .lp-team-member { text-align: left; }
.lp-template-studio .lp-team-member img, .lp-template-studio .lp-team-photo-empty { width: 100%; height: auto; aspect-ratio: 3 / 4; border-radius: 0; margin: 0 0 1rem; }
.lp-template-studio .lp-team-member h3 { font-family: var(--lp-heading); font-size: 1.15rem; }

/* Portfolio — visual-first, editorial, generous whitespace, restrained copy. Distinct from Studio:
   no oversized display type or hard color blocks; the image carries the page. */
.lp-template-portfolio .lp-nav { max-width: 1280px; min-height: 92px; }
.lp-template-portfolio .lp-hero { max-width: none; padding: 0; display: flex; flex-direction: column; }
.lp-template-portfolio .lp-hero-copy { order: 2; max-width: 640px; margin: 0 auto; padding: 56px 28px 96px; text-align: center; }
.lp-template-portfolio .lp-hero-eyebrow, .lp-template-portfolio .lp-kicker, .lp-template-portfolio .lp-hero-badge { letter-spacing: 0.32em; background: none; padding: 0; }
.lp-template-portfolio .lp-hero h1 { font-family: var(--lp-heading); font-weight: 500; font-size: clamp(2.1rem, 4vw, 3.25rem); letter-spacing: -0.01em; }
.lp-template-portfolio .lp-subheadline { margin: 0 auto; }
.lp-template-portfolio .lp-hero-media { order: 1; margin: 0; }
.lp-template-portfolio .lp-hero-media img { width: 100%; height: 86vh; max-height: 900px; object-fit: cover; border-radius: 0; box-shadow: none; }
.lp-template-portfolio .lp-services { max-width: 1240px; padding-block: 40px 40px; }
.lp-template-portfolio .lp-service-grid { display: block; }
.lp-template-portfolio .lp-service { grid-template-columns: 1fr; border: 0; background: transparent; border-radius: 0; margin-bottom: 112px; }
.lp-template-portfolio .lp-service:last-child { margin-bottom: 0; }
.lp-template-portfolio .lp-service img { aspect-ratio: 16 / 10; }
.lp-template-portfolio .lp-service-copy { max-width: 640px; margin: 2rem auto 0; text-align: center; padding: 0; }
.lp-template-portfolio .lp-service-copy h3, .lp-template-portfolio .lp-service-copy h4 { font-family: var(--lp-heading); }
.lp-template-portfolio .lp-features { max-width: 900px; padding-block: 100px; text-align: center; }
.lp-template-portfolio .lp-section-heading { text-align: center; }
.lp-template-portfolio .lp-feature-grid { background: transparent; border: 0; gap: 2.5rem; }
.lp-template-portfolio .lp-feature { background: transparent; padding: 0; text-align: center; }
.lp-template-portfolio .lp-team { max-width: 420px; text-align: center; padding-block: 96px; }
.lp-template-portfolio .lp-team-grid { grid-template-columns: 1fr; }
.lp-template-portfolio .lp-team-member img, .lp-template-portfolio .lp-team-photo-empty { width: 160px; height: 160px; }
.lp-template-portfolio .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); text-align: center; }
.lp-template-portfolio .lp-testimonials { max-width: 720px; padding-block: 100px; }
.lp-template-portfolio .lp-testimonial-grid { grid-template-columns: 1fr; }
.lp-template-portfolio .lp-testimonial { background: transparent; padding: 0; text-align: center; font-family: var(--lp-heading); font-size: 1.35rem; font-style: italic; }
.lp-template-portfolio .lp-studio-contact { max-width: 720px; grid-template-columns: 1fr; text-align: center; padding-block: 100px; background: transparent; color: var(--lp-ink); }
.lp-template-portfolio .lp-studio-contact h2 { font-family: var(--lp-heading); font-weight: 500; }
.lp-template-portfolio .lp-studio-contact p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); }
.lp-template-portfolio .lp-studio-contact .lp-form-card { max-width: 420px; margin: 2rem auto 0; text-align: left; }
.lp-template-portfolio .lp-studio-contact input, .lp-template-portfolio .lp-studio-contact select { border-bottom-color: color-mix(in srgb, var(--lp-ink) 25%, var(--lp-bg)); color: var(--lp-ink); }
.lp-template-portfolio .lp-studio-contact button[type="submit"] { color: var(--lp-ink); border-color: color-mix(in srgb, var(--lp-ink) 35%, var(--lp-bg)); }

/* Store — product-first, retail energy: rounder chrome, bolder CTAs, price-forward cards. */
.lp-template-store .lp-hero { max-width: 1280px; padding-block: 64px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 56px; }
.lp-template-store .lp-hero-badge { background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-hero-media { margin: 0; }
.lp-template-store .lp-hero-media img { aspect-ratio: 4 / 5; border-radius: calc(var(--lp-radius) * 3); }
.lp-template-store .lp-cta { border-radius: 999px; padding: 1rem 2.1rem; font-weight: 700; }
.lp-template-store .lp-products { max-width: 1240px; padding-block: 72px; }
.lp-template-store .lp-product-grid { grid-template-columns: repeat(4, 1fr); }
.lp-template-store .lp-product-media, .lp-template-store .lp-product-media-empty { border-radius: calc(var(--lp-radius) * 2); }
.lp-template-store .lp-product .lp-cta { border-radius: 999px; }
.lp-template-store .lp-categories { max-width: 1240px; padding-block: 56px; }
.lp-template-store .lp-categories .lp-section-heading { text-align: left; margin: 0 0 1.75rem; }
.lp-template-store .lp-category-grid { grid-template-columns: repeat(4, 1fr); }
.lp-template-store .lp-category-tile { border-radius: calc(var(--lp-radius) * 2); }
.lp-template-store .lp-story { max-width: none; padding: 88px max(28px, calc((100vw - 1240px) / 2)); background: color-mix(in srgb, var(--lp-ink) 5%, var(--lp-bg)); }
.lp-template-store .lp-story-media img { border-radius: calc(var(--lp-radius) * 3); }
.lp-template-store .lp-logos { max-width: 1240px; border-block: 0; padding-block: 56px; }
.lp-template-store .lp-testimonials { max-width: 1240px; padding-block: 24px 72px; }
.lp-template-store .lp-testimonial-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-store .lp-testimonial { border-radius: calc(var(--lp-radius) * 2); }
.lp-template-store .lp-studio-contact { max-width: none; grid-template-columns: minmax(0, 1fr) minmax(0, 22rem); align-items: center; gap: 2.5rem; padding: 64px max(28px, calc((100vw - 1240px) / 2)); background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.6rem, 3vw, 2.2rem); }
.lp-template-store .lp-studio-contact .lp-form-card { background: color-mix(in srgb, var(--lp-on-primary) 12%, var(--lp-primary)); border: 0; }
.lp-template-store .lp-studio-contact input, .lp-template-store .lp-studio-contact select { border-bottom-color: color-mix(in srgb, var(--lp-on-primary) 30%, var(--lp-primary)); color: var(--lp-on-primary); }
.lp-template-store .lp-studio-contact button[type="submit"] { background: var(--lp-on-primary); color: var(--lp-primary); border-radius: 999px; }

@media (min-width: 640px) { .lp-gallery-grid { columns: 3; } }
@media (max-width: 900px) {
  .lp-template-store .lp-product-grid, .lp-template-store .lp-category-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-store .lp-testimonial-grid { grid-template-columns: 1fr; }
}
@media (max-width: 800px) {
  .lp-nav-links { display: none; }
  .lp-split, .lp-webinar, .lp-studio-contact, .lp-story, .lp-template-corporate-professional .lp-hero, .lp-template-studio .lp-hero, .lp-template-store .lp-hero, .lp-template-store .lp-studio-contact { grid-template-columns: 1fr; min-height: auto; }
  .lp-template-corporate-professional .lp-service-grid, .lp-template-studio .lp-service-grid { grid-template-columns: 1fr; }
  .lp-template-studio .lp-hero h1 { font-size: clamp(3rem, 15vw, 5rem); }
  .lp-template-studio .lp-team-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-portfolio .lp-hero-media img { height: 62vh; }
  .lp-template-store .lp-studio-contact { padding-block: 48px; }
}
</style>
${input.injectedHeadScripts ?? ''}
</head>
<body class="lp-template-${escapeHtml(renderer)}">
${bodyHtml}
${webinarScript}
${galleryScript}
${runtime}
</body>
</html>`
}
