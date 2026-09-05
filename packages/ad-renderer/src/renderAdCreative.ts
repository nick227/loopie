import { resolveAdCreativeDesign, FORMAT_ASPECT_RATIO } from './presets'
import type { AdCreativeInput } from './types'

// The one renderer every surface calls — Ad Designer live preview, a Loopie Page's ad-creative
// section, a River AD post, and the generated embed document. See CLAUDE.md's Ad Designer
// "CRITICAL RENDERING REQUIREMENT": no surface may hand-roll its own layout for a creative: they
// all call renderAdCreativeFragment (or renderAdCreativeDocument, which just wraps it) with the
// same AdCreativeInput and get byte-identical markup back.

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

// clickUrl is the one field allowed to also be a root-relative path ("/v1/embed/.../click") — the
// ad-server's own embed routes resolve their click-tracking redirect same-origin to the iframe
// document they just served, so they never have (and don't need) an absolute URL to hand in.
// Deliberately excludes "//..." (protocol-relative — could point anywhere) and anything else that
// isn't an absolute http(s) URL.
function safeHref(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  if (value.startsWith('/') && !value.startsWith('//')) return value
  return safeHttpUrl(value)
}

function lower(value: string): string {
  return value.toLowerCase()
}

/** The html fragment only — one <a>...</a> element, no <style>/<head>/<body>. Safe to inject via
 * dangerouslySetInnerHTML (React/River) or drop straight into a page-renderer section, as long as
 * AD_CREATIVE_STYLESHEET is present somewhere on the page exactly once. */
export function renderAdCreativeFragment(input: AdCreativeInput): string {
  const design = resolveAdCreativeDesign(input.format, input)
  const formatClass = `adc--${lower(design.format)}`
  const placementClass = `adc-place-${lower(design.textPlacement)}`
  const alignClass = `adc-align-${lower(design.textAlign)}`
  const fontClass = `adc-font-${lower(design.fontScale)}`
  const overlayClass = `adc-overlay--${lower(design.overlay)}`
  const focalClass = `adc-focal-${lower(design.mediaFocal)}`

  const mediaSrc = safeHttpUrl(input.mediaUrl)
  const mediaHtml = mediaSrc
    ? `<img class="adc-media-img ${focalClass}" src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(input.mediaAlt ?? '')}" loading="lazy" />`
    : `<div class="adc-media-empty ${focalClass}"></div>`

  const headlineHtml = input.headline
    ? `<p class="adc-headline">${escapeHtml(input.headline)}</p>`
    : ''
  const bodyHtml = input.primaryText
    ? `<p class="adc-body">${escapeHtml(input.primaryText)}</p>`
    : ''

  const href = safeHref(input.clickUrl) || '#'
  const ctaLabelHtml = input.ctaLabel ? escapeHtml(input.ctaLabel) : ''

  // BENEATH_COPY / INLINE_WITH_COPY render the CTA inside the copy block; FLOATING_BOTTOM /
  // TOP_BANNER render it as a sibling, positioned independently of text placement entirely.
  const ctaInline =
    ctaLabelHtml && design.ctaPlacement === 'INLINE_WITH_COPY'
      ? `<span class="adc-cta adc-cta-inline">${ctaLabelHtml}</span>`
      : ''
  const ctaBeneath =
    ctaLabelHtml && design.ctaPlacement === 'BENEATH_COPY'
      ? `<span class="adc-cta adc-cta-beneath">${ctaLabelHtml}</span>`
      : ''
  const ctaFloating =
    ctaLabelHtml && design.ctaPlacement === 'FLOATING_BOTTOM'
      ? `<span class="adc-cta adc-cta-floating">${ctaLabelHtml}</span>`
      : ''
  const ctaBanner =
    ctaLabelHtml && design.ctaPlacement === 'TOP_BANNER'
      ? `<span class="adc-cta-banner">${ctaLabelHtml}</span>`
      : ''

  const copyRowHtml = ctaInline
    ? `<div class="adc-copy-row">${bodyHtml}${ctaInline}</div>`
    : `${bodyHtml}${ctaBeneath}`

  const copyHtml =
    headlineHtml || copyRowHtml
      ? `<div class="adc-copy ${placementClass} ${alignClass} ${fontClass}">${headlineHtml}${copyRowHtml}</div>`
      : ''

  const accessibleLabel =
    input.accessibleLabel || input.headline || input.ctaLabel || 'Advertisement'

  return `<a class="adc ${formatClass}" href="${escapeHtml(href)}" target="_top" rel="noopener" aria-label="${escapeHtml(accessibleLabel)}">${ctaBanner}<div class="adc-media">${mediaHtml}</div><div class="adc-overlay ${overlayClass}"></div>${copyHtml}${ctaFloating}</a>`
}

// Static, format-agnostic stylesheet — the same rules for every creative, every surface. Emitted
// once per document (page-renderer includes it once in <head> when a page has at least one
// ad-creative section; the embed document below always includes it; River mounts it once in
// Shell.tsx). Deliberately plain CSS text, not a <style> tag, so callers can embed it either way.
export const AD_CREATIVE_STYLESHEET = `
.adc { position: relative; display: block; overflow: hidden; width: 100%; border-radius: 12px; text-decoration: none; color: #fff; background: #111; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; container-type: size; }
.adc--poster { aspect-ratio: ${FORMAT_ASPECT_RATIO.POSTER}; }
.adc--story { aspect-ratio: ${FORMAT_ASPECT_RATIO.STORY}; }
.adc--feed_post { aspect-ratio: ${FORMAT_ASPECT_RATIO.FEED_POST}; }
.adc-media { position: absolute; inset: 0; }
.adc-media-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.adc-media-empty { width: 100%; height: 100%; background: linear-gradient(135deg, #2a2a2a, #161616); }
.adc-focal-center { object-position: center; }
.adc-focal-top { object-position: center top; }
.adc-focal-bottom { object-position: center bottom; }
.adc-focal-left { object-position: left center; }
.adc-focal-right { object-position: right center; }
.adc-overlay { position: absolute; inset: 0; pointer-events: none; }
.adc-overlay--none { background: transparent; }
.adc-overlay--dark_gradient { background: linear-gradient(180deg, rgba(0,0,0,0) 42%, rgba(0,0,0,.52) 68%, rgba(0,0,0,.84) 100%); }
.adc-overlay--light_gradient { background: linear-gradient(180deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.88) 100%); }
.adc-overlay--solid_scrim { background: rgba(0,0,0,.45); }
.adc-copy { position: absolute; display: flex; flex-direction: column; gap: 0.55em; box-sizing: border-box; max-width: min(90%, 20rem); padding: clamp(14px, 5.5%, 28px); z-index: 2; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.35); }
.adc-overlay--light_gradient + .adc-copy { color: #14181f; text-shadow: none; }
.adc-place-top_left { top: 0; left: 0; align-items: flex-start; }
.adc-place-top_center { top: 0; left: 0; right: 0; align-items: center; max-width: none; margin-inline: auto; padding-inline: clamp(14px, 6%, 32px); }
.adc-place-top_right { top: 0; right: 0; align-items: flex-end; }
.adc-place-center { top: 50%; left: 0; right: 0; transform: translateY(-50%); align-items: center; max-width: none; margin-inline: auto; padding-inline: clamp(14px, 6%, 32px); }
.adc-place-bottom_left { bottom: 0; left: 0; align-items: flex-start; }
.adc-place-bottom_center { bottom: 0; left: 0; right: 0; align-items: center; max-width: none; margin-inline: auto; padding-inline: clamp(14px, 6%, 32px); }
.adc-place-bottom_right { bottom: 0; right: 0; align-items: flex-end; }
.adc-align-left { text-align: left; }
.adc-align-center { text-align: center; }
.adc-align-right { text-align: right; }
.adc-font-compact .adc-headline { font-size: clamp(0.95rem, 4.8cqi, 1.2rem); }
.adc-font-compact .adc-body { font-size: clamp(0.72rem, 3.2cqi, 0.9rem); }
.adc-font-standard .adc-headline { font-size: clamp(1.05rem, 5.5cqi, 1.4rem); }
.adc-font-standard .adc-body { font-size: clamp(0.78rem, 3.6cqi, 0.98rem); }
.adc-font-oversized .adc-headline { font-size: clamp(1.35rem, 7.5cqi, 2.4rem); }
.adc-font-oversized .adc-body { font-size: clamp(0.9rem, 4cqi, 1.15rem); }
.adc-headline { margin: 0; font-weight: 700; line-height: 1.18; letter-spacing: -0.01em; }
.adc-body { margin: 0; font-weight: 400; line-height: 1.35; opacity: 0.95; }
.adc-copy-row { display: flex; align-items: center; gap: 0.75em; flex-wrap: wrap; }
.adc-cta { display: inline-flex; align-items: center; justify-content: center; padding: 0.55em 1.1em; border-radius: 999px; background: #fff; color: #14181f; font-weight: 600; font-size: 0.8em; line-height: 1; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,.28); }
.adc-cta-beneath { align-self: flex-start; margin-top: 0.2em; }
.adc-place-top_center .adc-cta-beneath, .adc-place-bottom_center .adc-cta-beneath, .adc-place-center .adc-cta-beneath { align-self: center; }
.adc-place-top_right .adc-cta-beneath, .adc-place-bottom_right .adc-cta-beneath { align-self: flex-end; }
.adc-cta-floating { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); z-index: 3; padding: 0.65em 1.4em; border-radius: 999px; background: #fff; color: #14181f; font-weight: 600; font-size: 0.85em; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
.adc-cta-banner { position: absolute; top: 0; left: 0; right: 0; z-index: 3; padding: 0.55em 1em; background: rgba(17,17,17,.86); color: #fff; text-align: center; font-weight: 600; font-size: 0.85em; }
.adc--feed_post .adc-copy { gap: 0.45em; max-width: min(88%, 17.5rem); }
`.trim()

/** A full standalone HTML document — used by the embed route (iframe src) and the ad-server
 * "internal Page placement" route. Same fragment + same stylesheet as everywhere else.
 * `injectedHeadScripts` mirrors @project/page-renderer's identical param — the caller's own
 * impression/ready postMessage wiring, kept out of this package since it's a per-surface
 * embed-protocol concern, not part of the creative's rendering. */
export function renderAdCreativeDocument(
  input: AdCreativeInput,
  opts: { title?: string; injectedHeadScripts?: string } = {},
): string {
  const fragment = renderAdCreativeFragment(input)
  const title = opts.title || input.headline || 'Advertisement'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
/* Host iframe is already aspect-ratio sized by the embed snippet. Fill that slot —
   do not stretch the creative with flex:1/height:100% in a way that fights aspect-ratio. */
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; }
body { display: flex; align-items: center; justify-content: center; }
.adc { width: 100%; height: 100%; max-width: 100%; max-height: 100%; border-radius: 0; aspect-ratio: auto; }
${AD_CREATIVE_STYLESHEET}
</style>
${opts.injectedHeadScripts ?? ''}
</head>
<body>
${fragment}
</body>
</html>`
}

export { resolveAdCreativeDesign } from './presets'
export type { AdCreativeInput } from './types'
