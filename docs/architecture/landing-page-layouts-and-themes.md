# Landing page layouts & themes — developer guide

How to add a new **layout** (system template / renderer) or **theme** (color/font preset) to LOOPIE Pages.

Pages are **template-driven, not freeform**. A template declares which section _types_ exist and in what order. All templates share one canonical `PageContent` shape keyed by **slot groups**. A `renderer` id plus CSS theme tokens control look. Publish freezes content, theme, layout, form, ad slots, and schema into an immutable `PublishedPageVersion`.

```
LandingPageTemplate.schema  →  sections[] + renderer + themePresets
        ↓
LandingPage.content / theme / layoutConfig  (draft, mutable)
        ↓ publish
PublishedPageVersion  (content, theme, layoutConfig, formSnapshot,
                       adSlotSnapshot, schemaSnapshot — immutable)
        ↓
renderLandingPageHtml()  →  self-contained HTML (/p/{slug} + export)
```

---

## Mental model

| Concept               | What it is                                                    | Where it lives                                      |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| **Template / layout** | Catalog row: section list + `renderer` id                     | `LandingPageTemplate` + `packages/db/src/data/*.ts` |
| **Section type**      | Visual component name (`hero`, `photo-gallery`, …)            | Template `schema.sections[].type`                   |
| **Slot group**        | Canonical content hole (`content.hero`, `content.gallery`, …) | `packages/db/src/content.ts`                        |
| **Renderer**          | CSS / layout family applied to shared section types           | `schema.renderer` → `.lp-template-{id}`             |
| **Theme**             | Flat token map (colors, fonts, radius)                        | `LandingPage.theme` + presets in `pageThemes.ts`    |
| **LayoutConfig**      | Per-section `{ hidden?, order? }` only                        | `LandingPage.layoutConfig`                          |

**Rule:** content is keyed by slot group, not section key. One template must never declare two sections whose types map to the **same** slot group — they would silently share one content object.

---

## Key files

| Role                                     | Path                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Canonical content + slot map             | `packages/db/src/content.ts`                                                                            |
| Template schema types + lead-gen schemas | `packages/db/src/leadGenTemplate.ts`                                                                    |
| Theme presets (server SoT)               | `packages/db/src/pageThemes.ts`                                                                         |
| Rich template schemas + starter content  | `packages/db/src/data/{corporate-professional,webinar-signup,studio,portfolio,store,email-outreach}.ts` |
| Starter content registry                 | `packages/db/src/systemTemplates.ts`                                                                    |
| Package exports                          | `packages/db/src/client.ts`                                                                             |
| Upsert system templates into DB          | `apps/server/src/lib/ensureSystemTemplates.ts`                                                          |
| HTML shell + CSS vars + per-renderer CSS | `packages/page-renderer/src/renderLandingPage.ts`                                                       |
| Section-type switch                      | `packages/page-renderer/src/renderLandingPageSections.ts`                                               |
| Editor ↔ published parity tests          | `packages/page-renderer/src/__tests__/parity.test.ts`                                                   |
| Hosted `/p/{slug}`                       | `apps/server/src/services/LandingPageRenderService.ts`                                                  |
| Create / publish / export                | `apps/server/src/services/LandingPageService.ts`                                                        |
| Web content types (hand-synced)          | `apps/web/src/pages/landing-pages/components/types.ts`                                                  |
| Web theme presets (hand-synced)          | `apps/web/src/pages/landing-pages/components/pageThemes.ts`                                             |
| Plain canvas (lead-gen)                  | `…/PageCanvas.tsx`, `…/CanvasSection.tsx`                                                               |
| Rich canvas dispatch                     | `…/AdvancedTemplateRenderer.tsx`                                                                        |
| Rich React layouts                       | `apps/web/src/components/landing-pages/templates/*.tsx`                                                 |
| Theme / section toolbar                  | `…/PageToolbar.tsx`                                                                                     |

---

## Shipped system templates

Ensured lazily by `ensureSystemTemplates` (called from list/create/get template APIs).

| ID                                       | Name            | Category | `renderer`               | Schema source                    |
| ---------------------------------------- | --------------- | -------- | ------------------------ | -------------------------------- |
| `system-template-lead-gen`               | Sales page      | lead-gen | `standard` (default)     | `leadGenTemplate.ts`             |
| `system-template-lead-gen-media`         | Email capture   | lead-gen | `standard`               | `leadGenTemplate.ts`             |
| `system-template-corporate-professional` | Homepage        | advanced | `corporate-professional` | `data/corporate-professional.ts` |
| `system-template-webinar-signup`         | Event signup    | advanced | `webinar-signup`         | `data/webinar-signup.ts`         |
| `system-template-studio`                 | Creative studio | advanced | `studio`                 | `data/studio.ts`                 |
| `system-template-portfolio`              | Portfolio       | advanced | `portfolio`              | `data/portfolio.ts`              |
| `system-template-store`                  | Store           | advanced | `store`                  | `data/store.ts`                  |
| `system-template-email-outreach`         | Outreach page   | advanced | `email-outreach`         | `data/email-outreach.ts`         |

- **Lead-gen** (`formatVersion: 1.0`) edits in `PageCanvas` via `BLOCK_REGISTRY`.
- **Advanced / rich** (`formatVersion: 2.0`) edits in a dedicated React canvas under `AdvancedTemplateRenderer`. Both read/write the same `PageContent`.

---

## Template schema shape

```ts
type TemplateSectionDef = {
  key: string // stable id within this template (layoutConfig keys off this)
  type: string // section type → maps to a slot group
  order: number
  hideable?: boolean
  editable?: string[] // documentation only; not enforced at runtime
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
  sections?: TemplateSectionDef[]
  themeTokens?: string[] // historically an allowlist; currently [] on every shipped template
  themePresets?: typeof PAGE_THEME_PRESETS
}
```

Example (Studio — abbreviated):

```ts
export const studioSchema: TemplateSchema = {
  renderer: 'studio',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['headline', 'body', 'media', 'primaryCta'],
    },
    {
      key: 'gallery',
      type: 'photo-gallery',
      order: 4,
      hideable: true,
      editable: ['title', 'items'],
    },
    {
      key: 'footer',
      type: 'studio-contact',
      order: 9,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
    // …
  ],
  themeTokens: [],
}
```

---

## Section types ↔ slot groups

From `SECTION_TYPE_TO_SLOT_GROUP` in `packages/db/src/content.ts`:

| `type`                                          | Slot group     | Content fields the renderer reads                                |
| ----------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `nav`                                           | `nav`          | `brand`, `links[{label,url}]`                                    |
| `hero`                                          | `hero`         | `eyebrow`, `badges[]`, `headline`, `body`, `primaryCta`, `media` |
| `split-capture`                                 | `hero`         | `headline`, `media` + embedded form                              |
| `feature-grid`                                  | `features`     | `headline`, `body`, `items[{title,body}]`                        |
| `form-embed`                                    | —              | Form HTML only (not page content)                                |
| `footer` / `cta-band` / `studio-contact`        | `footer`       | `headline`, `body`, `cta` (+ form for contact types)             |
| `media-image` / `media-audio` / `media-youtube` | `media`        | `url`/`src`, `youtubeUrl`, …                                     |
| `logo-cloud`                                    | `logos`        | `title`, `items[{name}]`                                         |
| `service-selector`                              | `services`     | `title`, `body`, `items[{label,headline,description,media,cta}]` |
| `metrics`                                       | `metrics`      | `items[{value,label,description?}]`                              |
| `comparison`                                    | `comparison`   | `title`, `items[{feature,us,them}]`                              |
| `testimonials`                                  | `testimonials` | `headline`, `body`, `items[{quote,author,role?}]`                |
| `faq`                                           | `faq`          | `headline`, `body`, `items[{question,answer}]`                   |
| `webinar-widget`                                | `webinar`      | event/host fields + **live** `submissionCount`                   |
| `photo-gallery`                                 | `gallery`      | `title`, `items[{src\|url,alt,caption}]`                         |
| `team`                                          | `team`         | `headline`, `body`, `items[{name,role,bio,media}]`               |
| `product-grid`                                  | `products`     | `headline`, `body`, `items[{name,price,badge,media,cta}]`        |
| `category-grid`                                 | `categories`   | `headline`, `items[{label,url,media}]`                           |
| `story`                                         | `intro`        | `headline`, `body`, `media`                                      |

Unknown types render as empty string (no crash).

The same section type can **look different** per `renderer` (e.g. `service-selector` → tabs for corporate, stacked for studio; `logo-cloud` → marquee for studio/store; `testimonials` → carousel for studio/portfolio). That branching lives in `renderLandingPageSections.ts` and the matching React canvas.

---

## Themes

Themes are a **flat string map** on `LandingPage.theme`, usually produced from a preset.

**Server source of truth:** `packages/db/src/pageThemes.ts`  
**Web UI copy:** `apps/web/.../components/pageThemes.ts` (keep in sync; web may carry extra display-only fields)

| Token             | CSS variable           | Role                             |
| ----------------- | ---------------------- | -------------------------------- |
| `presetId`        | —                      | Metadata for matching the picker |
| `primaryColor`    | `--lp-primary`         | Buttons, accents                 |
| `onPrimaryColor`  | `--lp-on-primary`      | Text on primary                  |
| `backgroundColor` | `--lp-bg`              | Page background                  |
| `inkColor`        | `--lp-ink`             | Body text                        |
| `cardColor`       | `--lp-card`            | Cards / panels                   |
| `fontFamily`      | `body { font-family }` | Body face                        |
| `headingFont`     | `--lp-heading`         | Headings                         |
| `googleFonts`     | `<link>` query         | Google Fonts CSS2 query string   |
| `radius`          | `--lp-radius`          | Button / chip radius             |

Shipped presets: `carbon`, `shopfront`, `workshop`, `night-desk`.

Applied in hosted/export HTML roughly as:

```css
:root {
  --lp-primary: …;
  --lp-on-primary: …;
  --lp-bg: …;
  --lp-ink: …;
  --lp-card: …;
  --lp-heading: …;
  --lp-radius: …;
}
body {
  font-family: …;
  background: var(--lp-bg);
  color: var(--lp-ink);
}
```

Plus large `.lp-template-{renderer} …` rules for rich layouts. The editor applies the same CSS variables inline and loads `theme.googleFonts`.

`schema.themeTokens` is **not** enforced today (always `[]`). Real UX: `PageToolbar` picks from `schema.themePresets` or falls back to `PAGE_THEME_PRESETS`.

---

## Publish vs draft vs export

| Surface               | Schema used                           | Content/theme used                              |
| --------------------- | ------------------------------------- | ----------------------------------------------- |
| Hosted `/p/{slug}`    | `PublishedPageVersion.schemaSnapshot` | Published snapshot + `formSnapshot`             |
| Editor / draft export | Live `LandingPageTemplate.schema`     | Live draft `content` / `theme` / `layoutConfig` |

Implications:

- Switching a draft’s template does **not** change what live visitors see until republish.
- Editing the live `Form` after publish does **not** change the published page (`formSnapshot`).
- Template switch does **not** wipe unused content slots — they stay stored and reappear if another template uses that slot.

---

## How to add a new layout (template)

Decide first: **reuse existing section types + a new `renderer`**, or **mint a new section type + slot group**. Prefer reuse. Only add a slot when the content shape is genuinely different (Store’s `products` vs `categories` is the canonical example).

### 1. Schema + starter content

Create `packages/db/src/data/your-template.ts`:

- Stable id: `system-template-your-name`
- Unique `renderer` string
- `sections[]` with unique `key`s; **no two types that map to the same slot group**
- `yourTemplateStarterContent: PageContent` with sensible defaults
- Export title, description, schema, starter, id

### 2. Register

1. Export from `packages/db/src/client.ts`
2. Add starter to `SYSTEM_TEMPLATE_STARTER_CONTENT` in `packages/db/src/systemTemplates.ts`
3. Upsert in `apps/server/src/lib/ensureSystemTemplates.ts` (`category: 'advanced'`, `formatVersion: '2.0'` for rich layouts)
4. Add `renderer` to the union in `packages/db/src/leadGenTemplate.ts`

### 3. If you need a new slot / section type

Update **all** of:

1. `PageContent` + `SECTION_TYPE_TO_SLOT_GROUP` + `KNOWN_SLOT_GROUPS` in `packages/db/src/content.ts`
2. Hand-synced mirror in `apps/web/.../components/types.ts`
3. Flat field labels / editors in `ContentView.tsx` (`SLOT_GROUP_FIELDS`)
4. `renderSection` case in `packages/page-renderer/src/renderLandingPageSections.ts`
5. Rich React canvas (and/or `BLOCK_REGISTRY` if lead-gen)

### 4. Server render

1. Extend the `renderer` union / defaults in `renderLandingPage.ts`
2. Implement section HTML in `renderLandingPageSections.ts` (branch on `renderer` when shared types need a different layout)
3. Add `.lp-template-your-renderer { … }` CSS in `renderLandingPage.ts`
4. Extend `parity.test.ts`

### 5. Editor

1. Add template id constant + entry in `RICH_TEMPLATE_IDS` in `apps/web/.../components/types.ts`
2. New React canvas: `apps/web/src/components/landing-pages/templates/YourTemplate.tsx`
   - Read/write via `onSlotChange(slotGroup, next)` — same `PageContent` slots as the server
   - Apply theme CSS vars the same way existing canvases do
3. Wire in `AdvancedTemplateRenderer.tsx`
4. For plain lead-gen only: register in `CanvasSection.tsx` `BLOCK_REGISTRY` instead of a rich canvas

### 6. Verify

1. Restart / reload the server so `ensureSystemTemplates` upserts the row
2. Create a page from the new template in the UI
3. Edit content + theme, publish, open `/p/{slug}` and confirm it matches the editor
4. Run `parity.test.ts` and any relevant e2e (see `e2e/studio-template.spec.ts`, `e2e/landing-page-slice.spec.ts`)

---

## How to add a new theme preset

Usual path — no schema migration:

1. Add a `PageThemePreset` entry to **`PAGE_THEME_PRESETS` in both**:
   - `packages/db/src/pageThemes.ts`
   - `apps/web/.../components/pageThemes.ts`
2. Optionally restrict which presets a template offers via `schema.themePresets` (lead-gen already attaches the full list)
3. Users pick it in `PageToolbar`; `themeFromPreset` writes the token map onto the page

### How to add a new theme token (e.g. `--lp-accent`)

1. Add the field to `PageThemePreset` + every preset + `themeFromPreset`
2. Apply in `renderLandingPage.ts` `:root` / CSS
3. Apply the same var in `PageCanvas` and every rich template’s inline theme styles
4. Keep both `pageThemes.ts` files in sync

---

## Checklist (copy/paste)

**New layout**

- [ ] `packages/db/src/data/<name>.ts` — id, schema, starter
- [ ] `client.ts` exports
- [ ] `systemTemplates.ts` starter map
- [ ] `ensureSystemTemplates.ts` upsert
- [ ] `leadGenTemplate.ts` `renderer` union
- [ ] New slot/type? → `content.ts` + web `types.ts` + `ContentView` + section renderer
- [ ] `renderLandingPageSections.ts` + `.lp-template-*` CSS
- [ ] Web: id, `RICH_TEMPLATE_IDS`, React canvas, `AdvancedTemplateRenderer`
- [ ] `parity.test.ts` (+ e2e if high-risk)
- [ ] Server reload; create → edit → publish → `/p/{slug}` visual check

**New theme preset**

- [ ] `packages/db/src/pageThemes.ts`
- [ ] `apps/web/.../pageThemes.ts`
- [ ] Optional: attach subset on a template’s `themePresets`

---

## Pitfalls

1. **Editor must match renderer.** Rich templates are a second visual implementation of the same vocabulary. Published HTML uses `packages/page-renderer`, not React. Keep CSS under `.lp-template-*` in parity with the canvas; use `parity.test.ts`.
2. **One slot group per section type per template.** Duplicate mappings collide on content.
3. **Hand-synced types.** `apps/web` does not depend on `@project/db` for these shapes — update `types.ts` and `pageThemes.ts` whenever the server packages change.
4. **`PageCanvas` is incomplete for advanced types.** New advanced section types without a rich React canvas won’t edit on the visual tab (Content tab may still work).
5. **`schemaSnapshot` / `formSnapshot`.** Hosted pages ignore later draft template or Form edits until republish.
6. **Export uses the live draft**, not the published snapshot.
7. **`themeTokens: []`.** Do not assume allowlist enforcement; presets + the free theme map are what matter.
8. **Media URLs.** Renderer prefers `src` then `url`; assets are resolved via `withResolvedMedia` on serve/export.
9. **Webinar seats filled** are not authored content — they are a live `FormSubmission` count at render time.
10. **No freeform builder.** V1 is intentionally template-constrained; don’t add a drag-and-drop section inventing system without an explicit product decision.

---

## Related docs

- Data model spine: `docs/architecture/00-unified-data-model.md`
- Pages IA: `docs/architecture/00-unified-ia-navigation.md`
- Project state / capture immutability notes: `CLAUDE.md`
