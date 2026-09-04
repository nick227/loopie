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
import {
  escapeHtml,
  renderBody,
  type RenderForm,
  type AdSlotEmbedItem,
} from './renderLandingPageSections'
import { FORMAT_ASPECT_RATIO } from '@project/ad-renderer'
import { carouselScript, serviceTabsScript } from './publishedScripts'

type TemplateSection = {
  key?: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

type TemplateSchema = {
  renderer?:
    | 'standard'
    | 'corporate-professional'
    | 'webinar-signup'
    | 'studio'
    | 'portfolio'
    | 'store'
    | 'email-outreach'
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
  var submitUrl = formEl.getAttribute('data-submit-url') || '';
  // /landing-pages/{id}/submissions → /landing-pages/{id}/form-start — same origin as the
  // submit action so formStartCount tracks real visitor focus (see LandingPage.formStartCount).
  var formStartUrl = submitUrl.replace(/\\/submissions\\/?$/, '/form-start');
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
  formEl.addEventListener('focusin', function onFormStart() {
    formEl.removeEventListener('focusin', onFormStart);
    if (!formStartUrl || formStartUrl === submitUrl) return;
    fetch(formStartUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(function () {});
  });
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
  adSlots?: { placement: string; context?: string; items: AdSlotEmbedItem[] }[]
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
  const faviconUrl =
    content.browser?.favicon?.src?.trim() ||
    content.browser?.favicon?.url?.trim() ||
    content.browser?.faviconUrl?.trim() ||
    DEFAULT_PAGE_FAVICON_URL
  const faviconHtml = faviconUrl ? `<link rel="icon" href="${escapeHtml(faviconUrl)}" />\n` : ''
  const renderer = input.templateSchema.renderer ?? 'standard'
  const bodyHtml = renderBody(
    sections,
    content,
    input.layoutConfig,
    formHtml,
    input.adSlots ?? [],
    input.sessionToken,
    input.submissionCount ?? 0,
    renderer,
  )

  const theme = input.theme ?? {}
  const primaryColor = theme.primaryColor ?? '#FF2D6A'
  const onPrimaryColor = theme.onPrimaryColor ?? '#FFFFFF'
  const backgroundColor = theme.backgroundColor ?? '#FFFFFF'
  const inkColor = theme.inkColor ?? '#0A0A0A'
  const cardColor = theme.cardColor ?? '#F5F5F5'
  const fontFamily = theme.fontFamily ?? '"DM Sans", ui-sans-serif, system-ui, sans-serif'
  const headingFont = theme.headingFont ?? 'Syne, ui-sans-serif, system-ui, sans-serif'
  const googleFonts =
    theme.googleFonts ?? 'family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800'
  const radius = theme.radius ?? '9999px'

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

  const scrollAnimationScript =
    renderer === 'studio' || renderer === 'portfolio'
      ? `<script>
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-lp-capture')) return;

  var snaps = document.querySelectorAll('[data-lp-snap]');
  var bridges = document.querySelectorAll('[data-lp-parallax-bridge]');
  var parallaxBgs = document.querySelectorAll('.lp-parallax-bg');
  var fadeInRows = document.querySelectorAll('.lp-fade-in-row');

  function panelProgress(el) {
    var rect = el.getBoundingClientRect();
    var wh = window.innerHeight || 1;
    var total = rect.height + wh;
    if (total <= 0) return 0.5;
    return Math.max(0, Math.min(1, (wh - rect.top) / total));
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

  function applyFx(el, p) {
    var fx = el.getAttribute('data-lp-fx') || '';
    el.style.setProperty('--lp-p', String(p));

    var wash = el.querySelector('.lp-color-wash, .lp-contact-fill');
    if (wash) {
      var edge = wash.getAttribute('data-lp-wash-edge') || 'bottom';
      var amount = lerp(0, 100, clamp01((p - 0.12) / 0.43)) + '%';
      if (edge === 'left' || edge === 'right') {
        wash.style.width = amount;
        wash.style.height = '100%';
      } else {
        wash.style.height = amount;
        wash.style.width = '100%';
      }
      // Crossfade type into the wash's readable foreground (theme-safe when primary ≈ ink).
      var washColor = wash.getAttribute('data-lp-wash-color') || 'ink';
      var tone = el.getAttribute('data-lp-tone') || 'bg';
      var toneFg = { bg: '--lp-ink', card: '--lp-ink', clear: '--lp-ink', ink: '--lp-bg', primary: '--lp-on-primary' };
      var washFg = { ink: '--lp-bg', primary: '--lp-on-primary', bg: '--lp-ink', card: '--lp-ink' };
      var from = toneFg[tone] || '--lp-ink';
      var to = washFg[washColor] || '--lp-bg';
      var mixT = clamp01((p - 0.18) / 0.34);
      el.style.color = 'color-mix(in srgb, var(' + from + ') ' + ((1 - mixT) * 100) + '%, var(' + to + ') ' + (mixT * 100) + '%)';
    }

    if (fx === 'hero-wipe') {
      var t = clamp01((p - 0.15) / 0.3);
      var copy = el.querySelector('.lp-hero-copy');
      var media = el.querySelector('.lp-hero-media');
      if (copy) copy.style.clipPath = 'inset(0 ' + ((1 - t) * 100) + '% 0 0)';
      if (media) {
        media.style.transform = 'translateY(' + lerp(40, -48, p) + 'px) scale(' + lerp(1.08, 1, p) + ')';
      }
      return;
    }

    if (fx === 'rise') {
      var kids = el.querySelectorAll('.lp-metric, .lp-feature, .lp-team-member');
      kids.forEach(function(kid, i) {
        var start = 0.2 + i * 0.08;
        var local = clamp01((p - start) / 0.22);
        kid.style.transform = 'translateY(' + lerp(56, 0, local) + 'px)';
        kid.style.opacity = String(local);
      });
      return;
    }

    if (fx === 'service-slide') {
      var img = el.querySelector('img');
      var copy = el.querySelector('.lp-service-copy');
      var t2 = clamp01((p - 0.2) / 0.3);
      if (img) img.style.transform = 'scale(' + lerp(1.1, 1, t2) + ')';
      if (copy) {
        var odd = false;
        var sib = el;
        var n = 0;
        while (sib.previousElementSibling) { sib = sib.previousElementSibling; if (sib.classList && sib.classList.contains('lp-service')) n++; }
        odd = n % 2 === 1;
        copy.style.transform = 'translateX(' + lerp(odd ? 48 : -48, 0, t2) + 'px)';
        copy.style.opacity = String(t2);
      }
      return;
    }

    if (fx === 'h-drift') {
      var grid = el.querySelector('.lp-gallery-grid');
      if (grid) grid.style.transform = 'translateX(' + lerp(0, -28, clamp01((p - 0.1) / 0.8)) + '%)';
      return;
    }

    if (fx === 'track-tighten') {
      var quote = el.querySelector('.lp-testimonial.is-active p, .lp-testimonial p');
      if (quote) {
        var t3 = clamp01((p - 0.2) / 0.3);
        quote.style.letterSpacing = lerp(0.1, -0.02, t3) + 'em';
        quote.style.opacity = String(lerp(0.25, 1, t3));
      }
    }
  }

  var update = function() {
    bridges.forEach(function(bridge) {
      var rect = bridge.getBoundingClientRect();
      var total = Math.max(1, bridge.offsetHeight - window.innerHeight);
      var bp = Math.max(0, Math.min(1, -rect.top / total));
      var sticky = bridge.querySelector('.lp-parallax-sticky');
      var img = bridge.querySelector('.lp-parallax-img');
      var fade = bp < 0.5 ? 1 : Math.max(0, 1 - (bp - 0.5) / 0.42);
      if (sticky) sticky.style.opacity = String(fade);
      if (img) img.style.transform = 'translateY(' + (bp * 22) + '%)';
    });

    snaps.forEach(function(el) { applyFx(el, panelProgress(el)); });

    parallaxBgs.forEach(function(el) {
      var rect = el.parentElement.getBoundingClientRect();
      var progress = Math.max(0, Math.min(1, 1 - (rect.bottom / window.innerHeight)));
      el.style.transform = 'translateY(' + (150 * progress) + 'px)';
    });
  };

  window.addEventListener('scroll', function() { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', function() { window.requestAnimationFrame(update); }, { passive: true });
  update();

  if (fadeInRows.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var ratio = entry.intersectionRatio;
        var el = entry.target;
        el.style.transform = 'translateY(' + ((1 - ratio) * 50) + 'px)';
        el.style.opacity = ratio;
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] });
    fadeInRows.forEach(function(el) {
      el.style.transition = 'none';
      observer.observe(el);
    });
  }
})();
</script>`
      : ''

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
.lp-nav-cta { display: inline-flex; align-items: center; padding: 0.55rem 1.1rem; background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; border-radius: var(--lp-radius); font-size: 0.875rem; font-weight: 700; white-space: nowrap; }
.lp-kicker { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lp-primary); }
.lp-hero-eyebrow, .lp-hero-badge { display: inline-block; margin: 0 0 1.25rem; padding: 0.4rem 0.9rem; border-radius: 999px; background: color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.lp-hero h1 { font-family: var(--lp-heading); font-size: clamp(2.4rem, 5vw, 3.6rem); line-height: 1.08; letter-spacing: -0.035em; margin: 0 0 1rem; font-weight: 700; }
.lp-subheadline { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 1.08rem; line-height: 1.55; max-width: 36rem; margin: 0; }
.lp-hero-media { margin-top: 2rem; }
.lp-hero-media img { width: 100%; display: block; object-fit: cover; border-radius: calc(var(--lp-radius) * 2); }
.lp-cta { display: inline-block; margin-top: 1.5rem; padding: 0.85rem 1.5rem; background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; border-radius: var(--lp-radius); font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em; }
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
button[type="submit"] { padding: 0.85rem 1.5rem; background: var(--lp-primary); color: var(--lp-on-primary); border: none; border-radius: var(--lp-radius); cursor: pointer; font: inherit; font-weight: 600; }
.lp-footer { text-align: center; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); font-size: 0.875rem; }
.lp-ad { padding: 16px 28px; max-width: 1040px; margin: 0 auto; }
.lp-ad iframe { width: 100%; min-height: 90px; max-height: 120px; border: 0; display: block; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); }
/* Ad Designer placement contexts (2026-09-03) — width caps the ad's prominence on the page;
   height/shape always comes from the creative's own format, never the context, so a Poster never
   gets stretched or cropped to fit an unrelated box. */
.lp-ad--inline { max-width: 360px; }
.lp-ad--contained { max-width: 560px; }
.lp-ad--promotional { max-width: 900px; }
.lp-ad--format-poster iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.POSTER}; min-height: 0; max-height: none; }
.lp-ad--format-story iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.STORY}; min-height: 0; max-height: none; }
.lp-ad--format-feed_post iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.FEED_POST}; min-height: 0; max-height: none; }
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
.lp-service-tabs { display: grid; gap: 2rem; grid-template-columns: minmax(0, .42fr) minmax(0, .58fr); align-items: start; }
.lp-service-tablist { display: flex; flex-direction: column; gap: .75rem; }
.lp-service-tab { text-align: left; padding: 1.1rem 1.25rem; border: 1px solid transparent; border-radius: calc(var(--lp-radius) * 2); background: transparent; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); font: inherit; font-size: 1.1rem; font-weight: 700; cursor: pointer; }
.lp-service-tab.is-active { background: var(--lp-card); border-color: color-mix(in srgb, var(--lp-ink) 15%, var(--lp-bg)); color: var(--lp-ink); box-shadow: 0 20px 40px -20px rgba(0,0,0,.15); }
.lp-service-panel { display: none; overflow: hidden; border-radius: calc(var(--lp-radius) * 3); border: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); background: var(--lp-card); }
.lp-service-panel.is-active { display: block; }
.lp-service-panel img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.lp-service-panel .lp-service-copy { padding: 1.75rem; }
.lp-service-index { display: block; font-family: var(--lp-heading); font-size: 1.75rem; font-weight: 700; color: color-mix(in srgb, var(--lp-ink) 28%, var(--lp-bg)); margin-bottom: .75rem; }
.lp-logo-marquee { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
.lp-logo-marquee-track { display: flex; width: max-content; align-items: center; gap: 4rem; animation: lp-marquee 28s linear infinite; }
.lp-logo-marquee-track .lp-logo { flex-shrink: 0; font-size: 1.2rem; font-weight: 600; opacity: .6; }
@keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .lp-logo-marquee-track { animation: none; flex-wrap: wrap; width: auto; justify-content: center; }
}
.lp-carousel-viewport { position: relative; }
.lp-carousel-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.75rem; }
.lp-carousel-controls button { border: 0; background: transparent; color: color-mix(in srgb, var(--lp-ink) 55%, var(--lp-bg)); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: .35rem .55rem; }
.lp-carousel-dots { display: flex; gap: .4rem; }
.lp-carousel-dot { width: 1.5rem; height: 1.5rem; padding: 0; border: 0; background: transparent; cursor: pointer; position: relative; }
.lp-carousel-dot::after { content: ''; position: absolute; inset: .45rem; border-radius: 999px; background: color-mix(in srgb, var(--lp-ink) 25%, var(--lp-bg)); }
.lp-carousel-dot.is-active::after { background: var(--lp-ink); }
.lp-form-reassure { margin: -.35rem 0 1.1rem; font-size: .9rem; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); }
.lp-email-chip { font-size: 11px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: color-mix(in srgb, var(--lp-ink) 45%, var(--lp-card)); }
.lp-email-foot { max-width: 560px; margin: 0 auto; padding: 1.1rem 1.75rem 1.4rem; text-align: center; font-size: 11px; line-height: 1.6; color: color-mix(in srgb, var(--lp-ink) 48%, var(--lp-bg)); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-top: 0; border-radius: 0 0 10px 10px; background: var(--lp-card); }
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
.lp-template-corporate-professional .lp-nav { position: sticky; top: 0; z-index: 50; max-width: 1152px; min-height: auto; margin: 1rem auto 0; padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: color-mix(in srgb, var(--lp-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: var(--lp-radius); backdrop-filter: blur(12px); }
.lp-template-corporate-professional .lp-nav-cta { border-radius: var(--lp-radius); }
.lp-template-corporate-professional .lp-hero { max-width: 1152px; padding-top: 64px; padding-bottom: 96px; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); align-items: center; gap: 40px; }
.lp-template-corporate-professional .lp-hero h1 { font-size: clamp(3rem, 7vw, 5rem); font-weight: 800; line-height: 0.95; letter-spacing: -0.04em; text-transform: uppercase; }
.lp-template-corporate-professional .lp-hero-media { margin: 0; }
.lp-template-corporate-professional .lp-hero-media img { aspect-ratio: 4 / 3; border-radius: var(--lp-radius); box-shadow: none; }
.lp-template-corporate-professional .lp-hero .lp-cta { border-radius: var(--lp-radius); font-weight: 700; }
.lp-template-corporate-professional .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); text-align: center; }
.lp-template-corporate-professional .lp-logo-row { max-width: 1152px; margin: 0 auto; justify-content: space-around; font-size: 1.15rem; font-weight: 800; opacity: .65; }
.lp-template-corporate-professional .lp-services, .lp-template-corporate-professional .lp-features, .lp-template-corporate-professional .lp-comparison, .lp-template-corporate-professional .lp-testimonials, .lp-template-corporate-professional .lp-faq { max-width: 1152px; padding-block: 96px; }
.lp-template-corporate-professional .lp-service-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-corporate-professional .lp-metrics { max-width: none; padding: 80px max(28px, calc((100vw - 1120px) / 2)); background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-corporate-professional .lp-metric-value { font-size: clamp(3rem, 6vw, 4.75rem); font-weight: 800; letter-spacing: -0.03em; }
.lp-template-corporate-professional .lp-metric-label { color: color-mix(in srgb, var(--lp-bg) 75%, var(--lp-ink)); }
.lp-template-corporate-professional .lp-metric p { line-height: 1.5; color: color-mix(in srgb, var(--lp-bg) 70%, var(--lp-ink)); }
.lp-template-corporate-professional .lp-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); background: color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: var(--lp-radius); overflow: hidden; }
.lp-template-corporate-professional .lp-feature { padding: 2rem; border: 0; border-radius: 0; background: var(--lp-bg); }
.lp-template-corporate-professional .lp-studio-contact { max-width: none; padding: 100px max(28px, calc((100vw - 1152px) / 2)); background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-corporate-professional .lp-studio-contact button[type="submit"] { border-radius: var(--lp-radius); background: var(--lp-primary); color: var(--lp-on-primary); border: 0; }
.lp-template-corporate-professional .lp-footer { max-width: none; padding-block: 100px; background: color-mix(in srgb, var(--lp-ink) 94%, var(--lp-bg)); color: var(--lp-bg); }

.lp-template-webinar-signup .lp-hero { max-width: none; padding: 80px max(28px, calc((100vw - 960px) / 2)) 88px; text-align: center; background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-webinar-signup .lp-hero h1 { font-size: clamp(2.75rem, 8vw, 5.5rem); font-weight: 800; line-height: 1.02; color: var(--lp-on-primary); }
.lp-template-webinar-signup .lp-hero .lp-subheadline { max-width: 44rem; margin-inline: auto; color: color-mix(in srgb, var(--lp-on-primary) 78%, transparent); }
.lp-template-webinar-signup .lp-hero-eyebrow, .lp-template-webinar-signup .lp-kicker, .lp-template-webinar-signup .lp-hero-badge { background: none; padding: 0; color: color-mix(in srgb, var(--lp-on-primary) 78%, transparent); letter-spacing: 0.22em; }
.lp-template-webinar-signup .lp-hero .lp-cta { background: var(--lp-ink); color: var(--lp-bg); border-radius: var(--lp-radius); }
.lp-template-webinar-signup .lp-hero-media { max-width: 896px; margin: 56px auto 0; }
.lp-template-webinar-signup .lp-hero-media img { border-radius: var(--lp-radius); box-shadow: none; }
.lp-template-webinar-signup .lp-webinar { max-width: none; padding: 64px max(28px, calc((100vw - 1120px) / 2)); background: var(--lp-bg); color: var(--lp-ink); }
.lp-template-webinar-signup .lp-webinar-meta { background: var(--lp-card); border: 2px solid color-mix(in srgb, var(--lp-ink) 28%, var(--lp-bg)); border-radius: var(--lp-radius); padding: 2rem; color: var(--lp-ink); }
.lp-template-webinar-signup .lp-webinar-form .lp-form-card { background: var(--lp-card); border: 2px solid color-mix(in srgb, var(--lp-ink) 28%, var(--lp-bg)); border-radius: var(--lp-radius); padding: 2rem; color: var(--lp-ink); }
.lp-template-webinar-signup .lp-features, .lp-template-webinar-signup .lp-testimonials, .lp-template-webinar-signup .lp-faq { max-width: 1024px; padding-block: 96px; }
.lp-template-webinar-signup .lp-feature-grid { gap: 1.5rem; border: 0; background: transparent; }
.lp-template-webinar-signup .lp-feature { border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: calc(var(--lp-radius) * 2); }
.lp-template-webinar-signup .lp-footer { max-width: none; padding-block: 80px; border-top: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-template-webinar-signup .lp-footer .lp-cta { border-radius: var(--lp-radius); }

.lp-template-studio { scroll-snap-type: y mandatory; }
.lp-template-studio .lp-parallax-bridge { position: relative; }
.lp-template-studio .lp-parallax-sticky { position: sticky; top: 0; z-index: 0; height: 100svh; overflow: hidden; }
.lp-template-studio .lp-parallax-img { position: absolute; inset: -12% 0 auto; width: 100%; height: 124%; object-fit: cover; will-change: transform, opacity; }
.lp-template-studio .lp-parallax-scrim { position: absolute; inset: 0; background: linear-gradient(to right, color-mix(in srgb, var(--lp-bg) 88%, transparent) 0%, color-mix(in srgb, var(--lp-bg) 55%, transparent) 48%, color-mix(in srgb, var(--lp-bg) 30%, transparent) 100%); }
.lp-template-studio .lp-parallax-content { position: relative; z-index: 1; margin-top: -100svh; }
.lp-template-studio .lp-snap--clear { background: transparent; color: var(--lp-ink); }
.lp-template-studio .lp-nav { position: sticky; top: 0; z-index: 40; max-width: none; min-height: 56px; padding-inline: max(24px, calc((100vw - 1280px) / 2)); border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 10%, transparent); background: color-mix(in srgb, var(--lp-bg) 90%, transparent); backdrop-filter: blur(10px); }
.lp-template-studio .lp-brand { font-family: var(--lp-heading); font-weight: 700; letter-spacing: -0.02em; }
.lp-template-studio .lp-nav-cta { background: transparent; color: var(--lp-ink); padding: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.22em; text-decoration: none; }
.lp-template-portfolio .lp-nav-cta { background: transparent; color: var(--lp-ink); padding: 0; font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }
.lp-template-email-outreach .lp-nav-cta { display: none; }
.lp-template-studio .lp-snap, .lp-template-studio .lp-service.lp-snap { position: relative; overflow: hidden; min-height: 100svh; max-width: none; margin: 0; padding: 80px max(24px, calc((100vw - 1280px) / 2)); scroll-snap-align: start; scroll-snap-stop: always; display: grid; align-content: center; gap: 2.5rem; }
.lp-template-studio .lp-snap--ink { background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-studio .lp-snap--primary { background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-studio .lp-snap--bg { background: var(--lp-bg); color: var(--lp-ink); }
.lp-template-studio .lp-hero { grid-template-columns: 1.15fr .85fr; gap: 48px; align-items: center; }
.lp-template-studio .lp-hero-copy { will-change: clip-path; }
.lp-template-studio .lp-hero h1 { font-size: clamp(2.75rem, 8vw, 6.5rem); line-height: .92; letter-spacing: -0.04em; font-weight: 700; max-width: 14ch; text-transform: none; }
.lp-template-studio .lp-hero .lp-subheadline { max-width: 28rem; color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); }
.lp-template-studio .lp-hero .lp-cta { background: var(--lp-ink); color: var(--lp-bg); border-radius: 0; font-weight: 600; letter-spacing: 0.02em; }
.lp-template-studio .lp-hero-media { margin: 0; will-change: transform; }
.lp-template-studio .lp-hero-media img { aspect-ratio: 4 / 5; border-radius: 0; width: 100%; object-fit: cover; }
.lp-template-studio .lp-logos { max-width: none; padding-block: 48px; background: var(--lp-card); border: 0; }
.lp-template-studio .lp-logo-row, .lp-template-studio .lp-logo-marquee-track .lp-logo { font-family: var(--lp-heading); font-size: 1.15rem; font-weight: 600; }
.lp-template-studio .lp-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem; text-align: left; }
.lp-template-studio .lp-metric { border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent); padding-top: 1.25rem; will-change: transform, opacity; }
.lp-template-studio .lp-metric-value { font-family: var(--lp-heading); font-size: clamp(3.5rem, 10vw, 7rem); line-height: .9; font-weight: 700; letter-spacing: -0.05em; color: inherit; }
.lp-template-studio .lp-metric-label { margin-top: 1rem; font-size: .875rem; color: color-mix(in srgb, currentColor 65%, transparent); }
.lp-template-studio .lp-services-intro .lp-kicker,
.lp-template-studio .lp-gallery .lp-kicker,
.lp-template-studio .lp-features .lp-kicker { margin: 0 0 1.25rem; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: color-mix(in srgb, currentColor 55%, transparent); }
.lp-template-studio .lp-gallery .lp-section-heading { margin: 0 0 2rem; max-width: 36rem; }
.lp-template-studio .lp-gallery .lp-section-intro { margin: 0; color: color-mix(in srgb, currentColor 70%, transparent); }
.lp-template-studio .lp-services-intro .lp-section-heading { margin: 0; max-width: 36rem; }
.lp-template-studio .lp-features .lp-section-heading { margin: 0 0 2.5rem; max-width: 36rem; }
.lp-template-studio .lp-services-intro h2, .lp-template-studio .lp-gallery > h2, .lp-template-studio .lp-section-heading h2, .lp-template-studio .lp-team .lp-section-heading h2 { font-size: clamp(1.75rem, 3.5vw, 2.75rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; text-align: left; margin: 0; text-transform: none; }
.lp-template-studio .lp-section-heading { margin: 0 0 2.5rem; text-align: left; max-width: 40rem; }
.lp-template-studio .lp-feature-grid { display: block; border: 0; background: transparent; border-radius: 0; }
.lp-template-studio .lp-feature { display: grid; grid-template-columns: 6rem 1fr; gap: 1.5rem; padding: 2rem 0; border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent); background: transparent; color: inherit; will-change: transform, opacity; }
.lp-template-studio .lp-feature h3 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
.lp-template-studio .lp-feature p { color: color-mix(in srgb, currentColor 78%, transparent); }
.lp-template-studio .lp-service { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 3rem; align-items: center; border: 0; background: transparent; border-radius: 0; margin: 0; }
.lp-template-studio .lp-service:nth-child(even of .lp-service) { direction: rtl; }
.lp-template-studio .lp-service:nth-child(even of .lp-service) > * { direction: ltr; }
.lp-template-studio .lp-service.lp-snap--primary .lp-kicker, .lp-template-studio .lp-service.lp-snap--ink .lp-kicker { color: color-mix(in srgb, currentColor 70%, transparent); }
.lp-template-studio .lp-service-copy { padding: 0; will-change: transform, opacity; }
.lp-template-studio .lp-service-copy h3 { font-family: var(--lp-heading); font-size: clamp(1.75rem, 3.5vw, 2.75rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; text-transform: none; }
.lp-template-studio .lp-service img { border-radius: 0; aspect-ratio: 4 / 3; width: 100%; object-fit: cover; will-change: transform; }
.lp-template-studio .lp-gallery-grid { display: flex; gap: 1rem; columns: unset; width: max-content; will-change: transform; }
.lp-template-studio .lp-gallery-tile { margin: 0; width: min(72vw, 320px); flex-shrink: 0; }
.lp-template-studio .lp-gallery-tile img { height: auto; width: 100%; object-fit: cover; aspect-ratio: 4 / 5; border-radius: 0; }
.lp-template-studio .lp-testimonials { text-align: left; background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-studio .lp-testimonials .lp-section-heading { margin: 0 0 2.5rem; text-align: left; }
.lp-template-studio .lp-testimonials .lp-section-heading h2, .lp-template-studio .lp-testimonials .lp-kicker { color: color-mix(in srgb, currentColor 55%, transparent); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; }
.lp-template-studio .lp-testimonial { padding: 0; background: transparent; border-radius: 0; font-family: var(--lp-heading); font-size: clamp(1.5rem, 3.5vw, 2.5rem); font-style: normal; font-weight: 600; text-transform: none; letter-spacing: -0.02em; line-height: 1.2; }
.lp-template-studio .lp-testimonial p { will-change: letter-spacing, opacity; }
.lp-template-studio .lp-testimonial cite { display: block; margin-top: 1.5rem; font-style: normal; font-size: .875rem; font-weight: 600; letter-spacing: 0; text-transform: none; color: color-mix(in srgb, currentColor 70%, transparent); }
.lp-template-studio .lp-carousel-controls button, .lp-template-studio .lp-carousel-dot::after { color: color-mix(in srgb, currentColor 60%, transparent); }
.lp-template-studio .lp-carousel-dot.is-active::after { background: currentColor; }
.lp-template-studio .lp-studio-contact { position: relative; grid-template-columns: 1fr 1fr; gap: 3rem; background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-studio .lp-color-wash, .lp-template-studio .lp-contact-fill { position: absolute; pointer-events: none; z-index: 0; }
.lp-template-studio .lp-color-wash[data-lp-wash-edge="bottom"], .lp-template-studio .lp-contact-fill { left: 0; right: 0; bottom: 0; height: 0; width: 100%; }
.lp-template-studio .lp-color-wash[data-lp-wash-edge="top"] { left: 0; right: 0; top: 0; height: 0; width: 100%; }
.lp-template-studio .lp-color-wash[data-lp-wash-edge="left"] { top: 0; bottom: 0; left: 0; width: 0; height: 100%; }
.lp-template-studio .lp-color-wash[data-lp-wash-edge="right"] { top: 0; bottom: 0; right: 0; width: 0; height: 100%; }
.lp-template-studio .lp-color-wash[data-lp-wash-color="ink"], .lp-template-studio .lp-contact-fill { background: var(--lp-ink); }
.lp-template-studio .lp-color-wash[data-lp-wash-color="primary"] { background: var(--lp-primary); }
.lp-template-studio .lp-color-wash[data-lp-wash-color="bg"] { background: var(--lp-bg); }
.lp-template-studio .lp-color-wash[data-lp-wash-color="card"] { background: var(--lp-card); }
.lp-template-studio .lp-snap > *:not(.lp-color-wash):not(.lp-contact-fill),
.lp-template-studio .lp-service > *:not(.lp-color-wash),
.lp-template-studio .lp-studio-contact > *:not(.lp-color-wash):not(.lp-contact-fill) { position: relative; z-index: 1; }
.lp-template-studio .lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.75rem, 3.5vw, 2.75rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; text-transform: none; margin: 0 0 0.75rem; }
.lp-template-studio .lp-studio-contact p { color: color-mix(in srgb, currentColor 78%, transparent); margin: 0; }
.lp-template-studio .lp-studio-contact .lp-form-card { background: transparent; border: none; padding: 0; }
.lp-template-studio .lp-studio-contact input, .lp-template-studio .lp-studio-contact select { border: none; border-bottom: 1px solid color-mix(in srgb, currentColor 35%, transparent); border-radius: 0; background: transparent; color: currentColor; padding-left: 0; }
.lp-template-studio .lp-studio-contact button[type="submit"] { background: var(--lp-bg); color: var(--lp-ink); border: 0; border-radius: 0; font-weight: 600; }
.lp-template-studio .lp-team-grid { grid-template-columns: repeat(3, 1fr); gap: 2.5rem 1.5rem; }
.lp-template-studio .lp-team-member { text-align: left; will-change: transform, opacity; }
.lp-template-studio .lp-team-member img, .lp-template-studio .lp-team-photo-empty { width: 100%; height: auto; aspect-ratio: 3 / 4; border-radius: 0; margin: 0 0 1rem; }
.lp-template-studio .lp-team-member h3 { font-family: var(--lp-heading); font-size: 1.1rem; font-weight: 600; letter-spacing: -0.02em; text-transform: none; }
.lp-template-studio .lp-faq { max-width: 720px; padding-block: 80px; background: var(--lp-card); }
@media (prefers-reduced-motion: reduce) {
  .lp-template-studio { scroll-snap-type: none; }
}

/* Portfolio — Noisefracture editorial: full-bleed overlay hero, left caption rails. */
.lp-template-portfolio .lp-nav { max-width: 1280px; min-height: 92px; }
.lp-template-portfolio .lp-hero { position: relative; max-width: none; padding: 0; display: block; min-height: 70vh; overflow: hidden; }
.lp-template-portfolio .lp-hero-media { position: absolute; inset: 0; margin: 0; z-index: 0; }
.lp-template-portfolio .lp-hero-media img { width: 100%; height: 100%; max-height: none; object-fit: cover; border-radius: 0; box-shadow: none; }
.lp-template-portfolio .lp-hero-copy { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; min-height: 70vh; max-width: none; margin: 0; padding: 7rem max(24px, calc((100vw - 1152px) / 2)) 4rem; text-align: left; color: var(--lp-bg); background: linear-gradient(to top, color-mix(in srgb, var(--lp-ink) 88%, transparent) 0%, color-mix(in srgb, var(--lp-ink) 42%, transparent) 45%, transparent 72%), linear-gradient(to right, color-mix(in srgb, var(--lp-ink) 50%, transparent) 0%, transparent 55%); }
.lp-template-portfolio .lp-hero-eyebrow, .lp-template-portfolio .lp-kicker, .lp-template-portfolio .lp-hero-badge { letter-spacing: 0.32em; background: none; padding: 0; color: color-mix(in srgb, var(--lp-bg) 72%, transparent); }
.lp-template-portfolio .lp-hero h1 { font-family: var(--lp-heading); font-weight: 600; font-size: clamp(2.4rem, 5.5vw, 3.75rem); line-height: 1.05; letter-spacing: -0.02em; color: var(--lp-bg); max-width: 36rem; }
.lp-template-portfolio .lp-subheadline { margin: 0; max-width: 28rem; color: color-mix(in srgb, var(--lp-bg) 72%, transparent); }
.lp-template-portfolio .lp-hero .lp-cta { background: var(--lp-primary); color: var(--lp-on-primary); border-radius: var(--lp-radius); text-decoration: none; }
.lp-template-portfolio .lp-services { max-width: 1240px; padding-block: 40px 40px; }
.lp-template-portfolio .lp-services .lp-section-heading { text-align: left; margin-left: 0; }
.lp-template-portfolio .lp-service-grid { display: block; }
.lp-template-portfolio .lp-service { grid-template-columns: 1fr; border: 0; background: transparent; border-radius: 0; margin-bottom: 112px; }
.lp-template-portfolio .lp-service:last-child { margin-bottom: 0; }
.lp-template-portfolio .lp-service img { aspect-ratio: 16 / 10; }
.lp-template-portfolio .lp-service-copy { max-width: 36rem; margin: 2rem 0 0; text-align: left; padding: 0; }
.lp-template-portfolio .lp-service-copy h3, .lp-template-portfolio .lp-service-copy h4 { font-family: var(--lp-heading); }
.lp-template-portfolio .lp-features { max-width: 900px; padding-block: 100px; text-align: center; }
.lp-template-portfolio .lp-section-heading { text-align: center; }
.lp-template-portfolio .lp-feature-grid { background: transparent; border: 0; gap: 2.5rem; }
.lp-template-portfolio .lp-feature { background: transparent; padding: 0; text-align: center; }
.lp-template-portfolio .lp-team { max-width: 420px; text-align: center; padding-block: 96px; }
.lp-template-portfolio .lp-team-grid { grid-template-columns: 1fr; }
.lp-template-portfolio .lp-team-member img, .lp-template-portfolio .lp-team-photo-empty { width: 160px; height: 160px; }
.lp-template-portfolio .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); text-align: center; }
.lp-template-portfolio .lp-testimonials { max-width: 720px; padding-block: 100px; text-align: center; }
.lp-template-portfolio .lp-testimonial-grid { grid-template-columns: 1fr; }
.lp-template-portfolio .lp-testimonial { background: transparent; padding: 0; text-align: center; font-family: var(--lp-heading); font-size: 1.35rem; font-style: italic; }
.lp-template-portfolio .lp-studio-contact { max-width: 720px; grid-template-columns: 1fr; text-align: center; padding-block: 100px; background: transparent; color: var(--lp-ink); }
.lp-template-portfolio .lp-studio-contact h2 { font-family: var(--lp-heading); font-weight: 500; }
.lp-template-portfolio .lp-studio-contact p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); }
.lp-template-portfolio .lp-studio-contact .lp-form-card { max-width: 420px; margin: 2rem auto 0; text-align: left; }
.lp-template-portfolio .lp-studio-contact input, .lp-template-portfolio .lp-studio-contact select { border-bottom-color: color-mix(in srgb, var(--lp-ink) 25%, var(--lp-bg)); color: var(--lp-ink); }
.lp-template-portfolio .lp-studio-contact button[type="submit"] { color: var(--lp-ink); border-color: color-mix(in srgb, var(--lp-ink) 35%, var(--lp-bg)); }

/* Store — product-first, retail energy: theme-bg color field, oversized display type, bento categories. */
.lp-template-store .lp-hero { max-width: none; padding: 64px max(28px, calc((100vw - 1280px) / 2)); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 56px; background: var(--lp-bg); }
.lp-template-store .lp-hero h1 { font-size: clamp(3rem, 8vw, 5.5rem); line-height: .9; letter-spacing: -0.04em; font-weight: 700; }
.lp-template-store .lp-hero-badge { background: var(--lp-primary); color: var(--lp-on-primary); border-radius: var(--lp-radius); }
.lp-template-store .lp-hero-media { margin: 0; }
.lp-template-store .lp-hero-media img { aspect-ratio: 4 / 5; border-radius: var(--lp-radius); }
.lp-template-store .lp-cta { border-radius: var(--lp-radius); padding: 1rem 2.1rem; font-weight: 700; background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-products { max-width: 1240px; padding-block: 72px; }
.lp-template-store .lp-product-grid { grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.lp-template-store .lp-product-media { border-radius: 6px; aspect-ratio: 1 / 1; overflow: hidden; }
.lp-template-store .lp-product-media-empty { border-radius: 6px; aspect-ratio: 1 / 1; background: #f5f5f5; }
.lp-template-store .lp-product h3 { margin-top: 0.75rem; font-size: 15px; font-weight: 500; text-align: left; }
.lp-template-store .lp-product-price { margin-top: 0.25rem; font-size: 15px; font-weight: 700; text-align: left; }
.lp-template-store .lp-product .lp-cta { border-radius: var(--lp-radius); }
.lp-template-store .lp-categories { max-width: 1240px; padding-block: 56px; }
.lp-template-store .lp-categories .lp-section-heading { text-align: left; margin: 0 0 1.75rem; }
.lp-template-store .lp-category-grid { grid-template-columns: repeat(4, 1fr); }
.lp-template-store .lp-category-grid > :first-child { grid-column: span 2; grid-row: span 2; }
.lp-template-store .lp-category-tile { border-radius: var(--lp-radius); }
.lp-template-store .lp-story { max-width: none; padding: 88px max(28px, calc((100vw - 1240px) / 2)); background: color-mix(in srgb, var(--lp-ink) 5%, var(--lp-bg)); }
.lp-template-store .lp-story-media img { border-radius: var(--lp-radius); }
.lp-template-store .lp-logos { max-width: 1240px; border-block: 0; padding-block: 56px; }
.lp-template-store .lp-testimonials { max-width: 1240px; padding-block: 24px 72px; }
.lp-template-store .lp-testimonial-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-store .lp-testimonial { border-radius: var(--lp-radius); }
.lp-template-store .lp-studio-contact { max-width: none; width: 100%; grid-template-columns: minmax(0, 1fr) minmax(0, 22rem); align-items: center; gap: 2.5rem; padding: 64px max(28px, calc((100vw - 1240px) / 2)); background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.6rem, 3vw, 2.2rem); }
.lp-template-store .lp-studio-contact .lp-form-card { background: color-mix(in srgb, var(--lp-on-primary) 12%, var(--lp-primary)); border: 0; border-radius: var(--lp-radius); }
.lp-template-store .lp-studio-contact input, .lp-template-store .lp-studio-contact select { border-bottom-color: color-mix(in srgb, var(--lp-on-primary) 30%, var(--lp-primary)); color: var(--lp-on-primary); border-radius: var(--lp-radius); }
.lp-template-store .lp-studio-contact button[type="submit"] { background: var(--lp-on-primary); color: var(--lp-primary); border-radius: var(--lp-radius); }

/* Email Outreach — constrained ~560px letter on color-field page canvas (Archive Journals). */
.lp-template-email-outreach { padding: 40px 16px 64px; }
.lp-template-email-outreach .lp-nav { max-width: 560px; min-height: auto; padding: 20px 28px; margin: 0 auto; background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-bottom: 0; border-radius: 10px 10px 0 0; }
.lp-template-email-outreach .lp-nav-links { display: none; }
.lp-template-email-outreach .lp-brand { font-family: var(--lp-heading); font-size: 1.15rem; font-weight: 600; }
.lp-template-email-outreach .lp-hero, .lp-template-email-outreach .lp-features, .lp-template-email-outreach .lp-metrics, .lp-template-email-outreach .lp-testimonials, .lp-template-email-outreach .lp-faq, .lp-template-email-outreach .lp-studio-contact { max-width: 560px; margin-left: auto; margin-right: auto; background: var(--lp-card); border-left: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-right: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); padding: 28px; }
.lp-template-email-outreach .lp-hero { padding-top: 32px; padding-bottom: 20px; }
.lp-template-email-outreach .lp-hero-eyebrow, .lp-template-email-outreach .lp-kicker, .lp-template-email-outreach .lp-hero-badge { display: block; letter-spacing: 0.2em; background: none; padding: 0; margin: 0 0 1.25rem; color: var(--lp-primary); border-radius: 0; }
.lp-template-email-outreach .lp-hero-eyebrow::after, .lp-template-email-outreach .lp-kicker::after, .lp-template-email-outreach .lp-hero-badge::after { content: ''; display: block; width: 3rem; height: 1px; margin-top: 0.65rem; background: color-mix(in srgb, var(--lp-ink) 22%, var(--lp-card)); }
.lp-template-email-outreach .lp-hero h1 { font-family: var(--lp-heading); font-size: clamp(1.55rem, 4vw, 1.85rem); font-weight: 600; line-height: 1.25; letter-spacing: -0.015em; }
.lp-template-email-outreach .lp-subheadline { font-size: 0.98rem; line-height: 1.65; max-width: none; }
.lp-template-email-outreach .lp-hero .lp-cta { background: transparent; color: var(--lp-ink); padding: 0; margin-top: 0.5rem; border-radius: 0; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
.lp-template-email-outreach .lp-hero-media { margin-top: 1.25rem; }
.lp-template-email-outreach .lp-hero-media img { aspect-ratio: 16 / 10; border-radius: var(--lp-radius); box-shadow: none; }
.lp-template-email-outreach .lp-features, .lp-template-email-outreach .lp-metrics, .lp-template-email-outreach .lp-testimonials, .lp-template-email-outreach .lp-faq { border-top: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-card)); padding-block: 32px; }
.lp-template-email-outreach .lp-section-heading { text-align: left; margin: 0 0 1.25rem; }
.lp-template-email-outreach .lp-section-heading h2 { font-size: 1.25rem; font-weight: 600; }
.lp-template-email-outreach .lp-feature-grid { display: block; border: 0; background: transparent; border-radius: 0; }
.lp-template-email-outreach .lp-feature { background: transparent; padding: 1.1rem 0; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-card)); }
.lp-template-email-outreach .lp-feature:last-child { border-bottom: 0; }
.lp-template-email-outreach .lp-metrics { padding-block: 28px; }
.lp-template-email-outreach .lp-metric-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.lp-template-email-outreach .lp-metric-value { font-family: var(--lp-heading); font-size: 1.6rem; }
.lp-template-email-outreach .lp-testimonials .lp-section-heading h2, .lp-template-email-outreach .lp-testimonials .lp-section-heading { font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: color-mix(in srgb, var(--lp-ink) 50%, var(--lp-card)); }
.lp-template-email-outreach .lp-testimonial-grid { grid-template-columns: 1fr; gap: 1.75rem; }
.lp-template-email-outreach .lp-testimonial { background: transparent; padding: 0; font-family: var(--lp-heading); font-size: 1.05rem; font-style: normal; }
.lp-template-email-outreach .lp-faq .lp-section-heading h2 { font-size: 1.25rem; }
.lp-template-email-outreach .lp-studio-contact { grid-template-columns: 1fr; text-align: left; border-top: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-card)); border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 0 0 10px 10px; background: var(--lp-card); color: var(--lp-ink); padding-block: 36px; }
.lp-template-email-outreach .lp-studio-contact h2 { font-family: var(--lp-heading); font-size: 1.25rem; font-weight: 600; }
.lp-template-email-outreach .lp-studio-contact p { color: color-mix(in srgb, var(--lp-ink) 68%, var(--lp-card)); }
.lp-template-email-outreach .lp-studio-contact .lp-form-card { background: transparent; border: 0; padding: 0; }
.lp-template-email-outreach .lp-studio-contact input, .lp-template-email-outreach .lp-studio-contact select, .lp-template-email-outreach .lp-studio-contact textarea { border: 1px solid color-mix(in srgb, var(--lp-ink) 18%, var(--lp-card)); border-radius: 6px; background: var(--lp-card); color: var(--lp-ink); }
.lp-template-email-outreach .lp-studio-contact button[type="submit"] { background: transparent; color: var(--lp-ink); border: 0; border-radius: 0; font-weight: 600; padding: 0; text-decoration: underline; text-underline-offset: 4px; }

@media (min-width: 640px) { .lp-gallery-grid { columns: 3; } }
@media (max-width: 900px) {
  .lp-template-store .lp-product-grid, .lp-template-store .lp-category-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-store .lp-category-grid > :first-child { grid-column: span 1; grid-row: span 1; }
  .lp-template-store .lp-testimonial-grid { grid-template-columns: 1fr; }
  .lp-template-studio .lp-gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-studio .lp-metrics { grid-template-columns: 1fr; }
}
@media (max-width: 800px) {
  .lp-nav-links { display: none; }
  .lp-split, .lp-webinar, .lp-studio-contact, .lp-story, .lp-template-corporate-professional .lp-hero, .lp-template-studio .lp-hero, .lp-template-store .lp-hero, .lp-template-store .lp-studio-contact, .lp-service-tabs, .lp-template-studio .lp-service { grid-template-columns: 1fr; min-height: auto; }
  .lp-template-corporate-professional .lp-service-grid { grid-template-columns: 1fr; }
  .lp-template-studio .lp-hero h1 { font-size: clamp(2.75rem, 16vw, 5rem); line-height: .85; }
  .lp-template-studio .lp-team-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-studio .lp-snap, .lp-template-studio .lp-service.lp-snap { min-height: 100svh; }
  .lp-template-portfolio .lp-hero, .lp-template-portfolio .lp-hero-copy { min-height: 62vh; }
  .lp-template-store .lp-hero h1 { font-size: clamp(2.5rem, 12vw, 3.5rem); }
  .lp-template-store .lp-studio-contact { padding-block: 48px; }
}
</style>
${input.injectedHeadScripts ?? ''}
</head>
<body class="lp-template-${escapeHtml(renderer)}">
${bodyHtml}
${webinarScript}
${galleryScript}
${serviceTabsScript}
${carouselScript}
${scrollAnimationScript}
${runtime}
</body>
</html>`
}
