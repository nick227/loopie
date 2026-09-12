import { escapeHtml } from './escape'
import type { PageTheme } from './types'

export type ResolvedTheme = {
  primaryColor: string
  onPrimaryColor: string
  backgroundColor: string
  inkColor: string
  cardColor: string
  fontFamily: string
  headingFont: string
  googleFonts: string
  radius: string
}

// Every value here is a real, published default — a page with no theme overrides at all still
// renders with a complete, deliberate look, never blank/unstyled CSS variables.
export function resolveTheme(theme: PageTheme): ResolvedTheme {
  const t = theme ?? {}
  return {
    primaryColor: t.primaryColor ?? '#FF2D6A',
    onPrimaryColor: t.onPrimaryColor ?? '#FFFFFF',
    backgroundColor: t.backgroundColor ?? '#FFFFFF',
    inkColor: t.inkColor ?? '#0A0A0A',
    cardColor: t.cardColor ?? '#F5F5F5',
    fontFamily: t.fontFamily ?? '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: t.headingFont ?? 'Syne, ui-sans-serif, system-ui, sans-serif',
    googleFonts:
      t.googleFonts ?? 'family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800',
    radius: t.radius ?? '9999px',
  }
}

// The `:root { --lp-* }` custom-property declarations every other CSS block (base, section,
// Starter skin, Layout) reads its colors/fonts/radius from — the one place a theme value actually
// touches markup/CSS, so changing a theme never requires touching any Starter or section's own
// rules.
//
// --lp-radius is intentionally allowed to be an extreme "pill" value (the default is 9999px) —
// that's the right look for a small control (button, badge, input, tab). It is NOT safe to apply
// to a large surface (a hero photo, a service card, a multi-line panel): a 9999px radius on
// anything bigger than a button just renders as a circle/stadium that crops its own content. So
// every large-surface consumer must use --lp-radius-lg instead, a capped derived token — `min()`
// means an explicit small/zero radius (a business that wants square corners) still passes through
// unchanged; only a runaway default/large value gets capped to a sane rounded-card look.
export function themeVariablesCss(theme: ResolvedTheme): string {
  return `--lp-primary: ${escapeHtml(theme.primaryColor)}; --lp-on-primary: ${escapeHtml(theme.onPrimaryColor)}; --lp-bg: ${escapeHtml(theme.backgroundColor)}; --lp-ink: ${escapeHtml(theme.inkColor)}; --lp-card: ${escapeHtml(theme.cardColor)}; --lp-heading: ${escapeHtml(theme.headingFont)}; --lp-radius: ${escapeHtml(theme.radius)}; --lp-radius-lg: min(${escapeHtml(theme.radius)}, 28px);`
}
