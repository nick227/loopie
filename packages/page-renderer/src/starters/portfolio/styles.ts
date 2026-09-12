export const PORTFOLIO_STYLES_CSS = `/* Portfolio — Noisefracture editorial: full-bleed overlay hero, left caption rails. */
.lp-template-portfolio .lp-nav { max-width: 1280px; min-height: 92px; }
.lp-template-portfolio .lp-nav-cta { background: transparent; color: var(--lp-ink); padding: 0; font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }
.lp-template-portfolio .lp-hero { position: relative; max-width: none; padding: 0; display: block; min-height: 70vh; overflow: hidden; }
.lp-template-portfolio .lp-hero-media { position: absolute; inset: 0; margin: 0; z-index: 0; }
.lp-template-portfolio .lp-hero-media img { width: 100%; height: 100%; max-height: none; object-fit: cover; border-radius: 0; box-shadow: none; }
.lp-template-portfolio .lp-hero-copy { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; min-height: 70vh; max-width: none; margin: 0; padding: 7rem max(24px, calc((100vw - 1152px) / 2)) 4rem; text-align: left; color: var(--lp-bg); background: linear-gradient(to top, color-mix(in srgb, var(--lp-ink) 88%, transparent) 0%, color-mix(in srgb, var(--lp-ink) 42%, transparent) 45%, transparent 72%), linear-gradient(to right, color-mix(in srgb, var(--lp-ink) 50%, transparent) 0%, transparent 55%); }
.lp-template-portfolio .lp-hero-eyebrow, .lp-template-portfolio .lp-kicker, .lp-template-portfolio .lp-hero-badge { letter-spacing: 0.32em; background: none; padding: 0; color: color-mix(in srgb, var(--lp-bg) 72%, transparent); }
.lp-template-portfolio .lp-hero h1 { font-family: var(--lp-heading); font-weight: 600; font-size: clamp(2.4rem, 5.5vw, 3.75rem); line-height: 1.05; letter-spacing: -0.02em; color: var(--lp-bg); max-width: 36rem; }
.lp-template-portfolio .lp-subheadline { margin: 0; max-width: 28rem; color: color-mix(in srgb, var(--lp-bg) 72%, transparent); }
.lp-template-portfolio .lp-hero .lp-cta { background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; }
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
.lp-template-portfolio .lp-studio-contact button[type="submit"] { color: var(--lp-ink); border-color: color-mix(in srgb, var(--lp-ink) 35%, var(--lp-bg)); }`
