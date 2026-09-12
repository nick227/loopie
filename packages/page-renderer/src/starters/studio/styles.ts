export const STUDIO_STYLES_CSS = `.lp-template-studio { scroll-snap-type: y mandatory; }
.lp-template-studio .lp-parallax-bridge { position: relative; }
.lp-template-studio .lp-parallax-sticky { position: sticky; top: 0; z-index: 0; height: 100svh; overflow: hidden; }
.lp-template-studio .lp-parallax-img { position: absolute; inset: -12% 0 auto; width: 100%; height: 124%; object-fit: cover; will-change: transform, opacity; }
.lp-template-studio .lp-parallax-scrim { position: absolute; inset: 0; background: linear-gradient(to right, color-mix(in srgb, var(--lp-bg) 88%, transparent) 0%, color-mix(in srgb, var(--lp-bg) 55%, transparent) 48%, color-mix(in srgb, var(--lp-bg) 30%, transparent) 100%); }
.lp-template-studio .lp-parallax-content { position: relative; z-index: 1; margin-top: -100svh; }
.lp-template-studio .lp-snap--clear { background: transparent; color: var(--lp-ink); }
.lp-template-studio .lp-nav { position: sticky; top: 0; z-index: 40; max-width: none; min-height: 56px; padding-inline: max(24px, calc((100vw - 1280px) / 2)); border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 10%, transparent); background: color-mix(in srgb, var(--lp-bg) 90%, transparent); backdrop-filter: blur(10px); }
.lp-template-studio .lp-brand { font-family: var(--lp-heading); font-weight: 700; letter-spacing: -0.02em; }
.lp-template-studio .lp-nav-cta { background: transparent; color: var(--lp-ink); padding: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.22em; text-decoration: none; }
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
}`
