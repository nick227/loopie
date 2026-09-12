import type { LayoutConfig, PageContent } from '@project/db'

export type TemplateSection = {
  key?: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

// A Starter's own identity/skin — see each starters/* module's own definition.ts for what it
// actually renders differently. This id is what `TemplateSchema.renderer` stores and what the
// published document's `lp-template-{id}` body class and CSS skin selectors key off.
export type StarterRendererId =
  | 'standard'
  | 'corporate-professional'
  | 'webinar-signup'
  | 'studio'
  | 'portfolio'
  | 'store'
  | 'email-outreach'

export type TemplateSchema = {
  renderer?: StarterRendererId
  sections?: TemplateSection[]
  themeTokens?: string[]
}

export type PageTheme = Record<string, string> | null | undefined

// Layout — a structural arrangement of a page's EXISTING content, independent of the Starter
// identity/skin (`renderer`, above) and never gating which sections/content exist. See
// PageLayoutVariant's doc comment in schema.prisma. Applied purely as a `data-lp-layout` attribute
// + additive CSS (@project/page-layout's LAYOUT_VARIANT_CSS) — it never changes which markup a
// section renderer emits, so a Starter's own skin/choreography (studio/portfolio scroll effects
// included) keeps working exactly as it does today, unaffected by this axis.
export type LayoutVariant = 'STACKED' | 'SPLIT' | 'CENTERED'

export type RenderFormField = {
  label: string
  fieldKey: string
  type: string
  required: boolean
  options: unknown
  defaultValue?: string | null
}

export type RenderForm = {
  id: string
  submitLabel: string
  successMessage?: string | null
  fields: RenderFormField[]
} | null

export type AdSlotEmbedItem = { embedUrl: string; format?: string | null }

export type AdSlotGroup = { placement: string; context?: string; items: AdSlotEmbedItem[] }

// One section's fully-resolved render input — everything a SectionRenderer needs that isn't
// specific to which starter/renderer is asking for it. Starter identity itself is never part of
// this: a section renderer only ever sees its own content, never has to branch on who called it.
export interface SectionRenderInput {
  section: TemplateSection
  // The slot-group content for this section (see @project/db's SECTION_TYPE_TO_SLOT_GROUP) — an
  // unknown/untyped object, narrowed defensively by each section renderer, exactly as before.
  content: unknown
  formHtml: string
  submissionCount: number
  // True when some OTHER section in this schema already embeds `formHtml` itself (studio-contact/
  // webinar-widget/split-capture) — only 'form-embed' consults this, to know whether it's a real,
  // independently-rendered block or purely Content-tab ordering/visibility metadata.
  formEmbeddedElsewhere: boolean
}

export type SectionRenderer = (input: SectionRenderInput) => string

// Keyed by TemplateSection.type. Deliberately a loose Record (not every key required) — both the
// base registry (sections/registry.ts) and a Starter's own overrides are partial.
export type SectionRendererRegistry = Partial<Record<string, SectionRenderer>>

// A raw, self-contained `<script>...</script>` block. Always a static string — nothing here is
// parameterized per-page, so no render-time templating is needed (contrast forms/runtime.ts,
// which does need per-submission values baked in).
export type PageBehaviorScript = string

export interface ComposeInput {
  sections: TemplateSection[]
  content: PageContent
  layoutConfig: LayoutConfig | null | undefined
  // Defaults to STACKED at the one call site (renderLandingPage.ts) — see LayoutVariant. Composers
  // only ever consult this for a structural decision no per-section renderer can make on its own
  // (e.g. composeDefault's hero+adjacent-media grouping under SPLIT); everything else is CSS.
  layoutVariant: LayoutVariant
  formHtml: string
  adSlots: AdSlotGroup[]
  sessionToken?: string
  submissionCount: number
  // Computed once, in composition/resolveSections.ts, against the sorted-but-not-yet-hidden-
  // filtered section list — see that module's own comment for why. Composers must use this value
  // rather than re-deriving it from `sections` (which by this point has already had hidden
  // entries removed).
  formEmbeddedElsewhere: boolean
  // Resolves and renders one section through the current Starter's overrides (falling back to
  // the shared base registry) — see sections/registry.ts. Composers never look up sections
  // themselves; they only ever call this.
  renderSection: (
    section: TemplateSection,
    content: unknown,
    formEmbeddedElsewhere: boolean,
  ) => string
}

export type PageComposer = (input: ComposeInput) => string

// The one place a Starter's identity is actually assembled. Every field is optional — a Starter
// with no entry here (or an id with no registry row at all) behaves exactly like 'standard':
// shared sections, shared composition, no extra styles, no extra behaviors.
export interface StarterDefinition {
  id: StarterRendererId
  // This Starter's own skin CSS (`.lp-template-{id} ...`), appended after the shared base/section
  // styles. Never touches shared class selectors' own base rules — only adds more specific ones.
  styles?: string
  // Overrides the default per-section-loop composition entirely (see composition/composePage.ts).
  // Only Studio (scroll-snap parallax bridging) and Email Outreach (footer strip) need this;
  // every other Starter uses the shared default composer untouched.
  compose?: PageComposer
  // Section types this Starter renders differently from the shared default (sections/registry.ts).
  sectionOverrides?: SectionRendererRegistry
  // Extra client-side behavior scripts this Starter needs beyond the always-on baseline
  // (behaviors/registry.ts's BASELINE_BEHAVIOR_SCRIPTS) — e.g. Studio/Portfolio's scroll-linked
  // motion effects.
  behaviors?: PageBehaviorScript[]
}
