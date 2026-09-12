export const STORE_STYLES_CSS = `/* Store — product-first, retail energy: theme-bg color field, oversized display type, bento categories. */
.lp-template-store .lp-hero { max-width: none; padding: 64px max(28px, calc((100vw - 1280px) / 2)); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 56px; background: var(--lp-bg); }
.lp-template-store .lp-hero h1 { font-size: clamp(3rem, 8vw, 5.5rem); line-height: .9; letter-spacing: -0.04em; font-weight: 700; }
.lp-template-store .lp-hero-badge { background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-hero-media { margin: 0; }
.lp-template-store .lp-hero-media img { aspect-ratio: 4 / 5; }
.lp-template-store .lp-cta { padding: 1rem 2.1rem; font-weight: 700; background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-products { max-width: 1240px; padding-block: 72px; }
.lp-template-store .lp-products .lp-section-heading { text-align: left; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); }
.lp-template-store .lp-products .lp-section-heading h2 { font-family: var(--lp-heading); font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; letter-spacing: -0.02em; margin: 0; color: var(--lp-ink); }
.lp-template-store .lp-product-grid { grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.lp-template-store .lp-product-media { border-radius: 6px; aspect-ratio: 1 / 1; overflow: hidden; }
.lp-template-store .lp-product-media-empty { border-radius: 6px; aspect-ratio: 1 / 1; background: #f5f5f5; }
.lp-template-store .lp-product h3 { margin-top: 0.75rem; font-size: 15px; font-weight: 500; text-align: left; }
.lp-template-store .lp-product-price { margin-top: 0.25rem; font-size: 15px; font-weight: 700; text-align: left; }
.lp-template-store .lp-product { position: relative; }
.lp-template-store .lp-product-badge { position: absolute; top: 0.75rem; left: 0.75rem; z-index: 10; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; background: var(--lp-primary); color: var(--lp-on-primary); border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.lp-template-store .lp-categories { max-width: 1240px; padding-block: 56px; }
.lp-template-store .lp-categories .lp-section-heading { text-align: left; margin: 0 0 1.75rem; }
.lp-template-store .lp-category-grid { grid-template-columns: repeat(4, 1fr); }
.lp-template-store .lp-category-grid > :first-child { grid-column: span 2; grid-row: span 2; }
.lp-template-store .lp-category-tile { }
.lp-template-store .lp-story { max-width: none; padding: 88px max(28px, calc((100vw - 1240px) / 2)); background: color-mix(in srgb, var(--lp-ink) 5%, var(--lp-bg)); }
.lp-template-store .lp-story-media img { }
.lp-template-store .lp-logos { max-width: 1240px; border-block: 0; padding-block: 56px; }
.lp-template-store .lp-testimonials { max-width: 1240px; padding-block: 24px 72px; }
.lp-template-store .lp-testimonial-grid { grid-template-columns: repeat(3, 1fr); }
.lp-template-store .lp-testimonial { }
.lp-template-store .lp-studio-contact { max-width: none; width: 100%; grid-template-columns: minmax(0, 1fr) minmax(0, 22rem); align-items: center; gap: 2.5rem; padding: 64px max(28px, calc((100vw - 1240px) / 2)); background: var(--lp-primary); color: var(--lp-on-primary); }
.lp-template-store .lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.6rem, 3vw, 2.2rem); }
.lp-template-store .lp-studio-contact .lp-form-card { background: transparent; border: 0; padding: 0; }
.lp-template-store .lp-studio-contact input, .lp-template-store .lp-studio-contact select, .lp-template-store .lp-studio-contact textarea { background: color-mix(in srgb, var(--lp-on-primary) 5%, transparent); border: 1px solid color-mix(in srgb, var(--lp-on-primary) 20%, transparent); color: var(--lp-on-primary); border-radius: 8px; padding: 0.75rem 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.lp-template-store .lp-studio-contact input::placeholder, .lp-template-store .lp-studio-contact textarea::placeholder { color: color-mix(in srgb, var(--lp-on-primary) 50%, transparent); }
.lp-template-store .lp-studio-contact button[type="submit"] { background: var(--lp-on-primary); color: var(--lp-primary); border-radius: 8px; padding: 0.75rem 1.5rem; font-weight: 700; border: none; margin-top: 1rem; }`
