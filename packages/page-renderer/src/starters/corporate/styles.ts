// Corporate Professional's own skin — mirrors the editable React canvas's layout vocabulary.
// See core/baseStyles.ts's doc comment for why this only ever adds more-specific overrides on
// top of the shared base/section styles, never redefines them.
export const CORPORATE_STYLES_CSS = `.lp-template-corporate-professional .lp-nav { position: sticky; top: 0; z-index: 50; max-width: 1152px; min-height: auto; margin: 1rem auto 0; padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: color-mix(in srgb, var(--lp-bg) 92%, transparent); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); backdrop-filter: blur(12px); }
.lp-template-corporate-professional .lp-nav-cta { }
.lp-template-corporate-professional .lp-hero { max-width: 1152px; padding-top: 64px; padding-bottom: 96px; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); align-items: center; gap: 40px; }
.lp-template-corporate-professional .lp-hero h1 { font-size: clamp(3rem, 7vw, 5rem); font-weight: 800; line-height: 0.95; letter-spacing: -0.04em; text-transform: uppercase; }
.lp-template-corporate-professional .lp-hero-media { margin: 0; }
.lp-template-corporate-professional .lp-hero-media img { aspect-ratio: 4 / 3; box-shadow: none; }
.lp-template-corporate-professional .lp-hero .lp-cta { font-weight: 700; }
.lp-template-corporate-professional .lp-logos { max-width: none; border-block: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); text-align: center; }
.lp-template-corporate-professional .lp-logo-row { max-width: 1152px; margin: 0 auto; justify-content: space-around; font-size: 1.15rem; font-weight: 800; opacity: .65; }
.lp-template-corporate-professional .lp-services, .lp-template-corporate-professional .lp-features, .lp-template-corporate-professional .lp-comparison, .lp-template-corporate-professional .lp-testimonials, .lp-template-corporate-professional .lp-faq { max-width: 1152px; padding-block: 96px; }
.lp-template-corporate-professional .lp-service-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-corporate-professional .lp-metrics { max-width: none; padding: 80px max(28px, calc((100vw - 1120px) / 2)); background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-corporate-professional .lp-metric-value { font-size: clamp(3rem, 6vw, 4.75rem); font-weight: 800; letter-spacing: -0.03em; }
.lp-template-corporate-professional .lp-metric-label { color: color-mix(in srgb, var(--lp-bg) 75%, var(--lp-ink)); }
.lp-template-corporate-professional .lp-metric p { line-height: 1.5; color: color-mix(in srgb, var(--lp-bg) 70%, var(--lp-ink)); }
.lp-template-corporate-professional .lp-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); background: color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); overflow: hidden; }
.lp-template-corporate-professional .lp-feature { padding: 2rem; border: 0; border-radius: 0; background: var(--lp-bg); }
.lp-template-corporate-professional .lp-studio-contact { max-width: none; padding: 100px max(28px, calc((100vw - 1152px) / 2)); background: var(--lp-ink); color: var(--lp-bg); }
.lp-template-corporate-professional .lp-studio-contact button[type="submit"] { background: var(--lp-primary); color: var(--lp-on-primary); border: 0; }
.lp-template-corporate-professional .lp-footer { max-width: none; padding-block: 100px; background: color-mix(in srgb, var(--lp-ink) 94%, var(--lp-bg)); color: var(--lp-bg); }`
