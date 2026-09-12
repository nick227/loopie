// Renders a LandingPage (or a PublishedPageVersion snapshot) to a self-contained HTML string,
// used by both the hosted /p/{slug} route and the /landing-pages/{id}/export endpoint.
//
// This is a structured, template-driven renderer — it walks LandingPageTemplate.schema.sections
// (a fixed vocabulary of section "type"s) and fills them from LandingPage.content, rather than
// interpreting arbitrary markup. That's the deliberate constraint: no freeform builder in V1.
//
// This file is deliberately thin: context → composition → styles/behaviors → document. Every
// Starter-specific decision (Studio's parallax bridging, Corporate's service tabs, Email
// Outreach's chip nav, ...) lives in starters/*, never here — see starters/registry.ts and each
// Starter's own definition.ts.

import {
  DEFAULT_PAGE_FAVICON_URL,
  normalizeLegacyPageContent,
  type LayoutConfig,
} from '@project/db'
import { resolveTheme } from './core/theme'
import { renderDocument } from './core/document'
import { resolveSections } from './composition/resolveSections'
import { composeDefault } from './composition/composePage'
import { renderSectionWith } from './sections/registry'
import { renderFormHtml } from './forms/submission'
import { BASELINE_BEHAVIOR_SCRIPTS } from './behaviors/registry'
import { getStarterDefinition, ALL_STARTER_DEFINITIONS } from './starters/registry'
import { escapeHtml } from './core/escape'
import type {
  TemplateSchema,
  PageTheme,
  LayoutVariant,
  RenderForm,
  AdSlotEmbedItem,
} from './core/types'

export type { TemplateSchema, PageTheme, LayoutVariant, AdSlotEmbedItem }

const ALL_STARTER_STYLES_CSS = ALL_STARTER_DEFINITIONS.map((def) => def.styles ?? '')
  .filter(Boolean)
  .join('\n')

export function renderLandingPageHtml(input: {
  pageName: string
  templateSchema: TemplateSchema
  // Accepts either canonical or legacy (pre-migration) content — normalized internally via
  // normalizeLegacyPageContent, so callers never need to normalize before calling this.
  content: unknown
  theme: PageTheme
  layoutConfig?: LayoutConfig | null
  // Defaults to STACKED (a no-op — the existing baseline arrangement) when omitted/null, which
  // covers every PublishedPageVersion published before this column existed. See LayoutVariant.
  layoutVariant?: LayoutVariant | null
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
  const starterId = input.templateSchema.renderer ?? 'standard'
  const starterDef = getStarterDefinition(starterId)

  const formHtml = renderFormHtml(
    input.form,
    input.submitActionUrl,
    input.sessionToken,
    input.publishedVersionId,
  )
  const content = normalizeLegacyPageContent(input.content)
  const { sections, formEmbeddedElsewhere, effectiveFormHtml } = resolveSections(
    input.templateSchema.sections ?? [],
    input.layoutConfig,
    formHtml,
  )

  const bodyHtml = (starterDef.compose ?? composeDefault)({
    sections,
    content,
    layoutConfig: input.layoutConfig,
    layoutVariant: input.layoutVariant ?? 'STACKED',
    formHtml: effectiveFormHtml,
    adSlots: input.adSlots ?? [],
    sessionToken: input.sessionToken,
    submissionCount: input.submissionCount ?? 0,
    formEmbeddedElsewhere,
    renderSection: (section, sectionContent, embeddedElsewhere) =>
      renderSectionWith(starterDef.sectionOverrides, {
        section,
        content: sectionContent,
        formHtml: effectiveFormHtml,
        submissionCount: input.submissionCount ?? 0,
        formEmbeddedElsewhere: embeddedElsewhere,
      }),
  })

  const pageTitle = content.browser?.title?.trim() || input.pageName
  const faviconUrl =
    content.browser?.favicon?.src?.trim() ||
    content.browser?.favicon?.url?.trim() ||
    content.browser?.faviconUrl?.trim() ||
    DEFAULT_PAGE_FAVICON_URL

  const theme = resolveTheme(input.theme)
  const layoutVariantAttr = (input.layoutVariant ?? 'STACKED').toLowerCase()

  const runtimeHtml =
    input.runtimeScriptUrl && input.businessId
      ? `<script src="${escapeHtml(input.runtimeScriptUrl)}" data-business="${escapeHtml(input.businessId)}"></script>`
      : ''

  return renderDocument({
    pageTitle,
    faviconUrl,
    theme,
    starterId,
    layoutVariantAttr,
    bodyHtml,
    // A single joined slot (even when empty) rather than spreading `behaviors` in — matches the
    // pre-extraction template's own shape (one `${scrollAnimationScript}` slot, always present,
    // often ''), including the blank line it leaves between the baseline scripts and the runtime
    // tag on every Starter that has no extra behaviors of its own.
    behaviorScripts: [...BASELINE_BEHAVIOR_SCRIPTS, (starterDef.behaviors ?? []).join('\n')],
    runtimeHtml,
    injectedHeadScripts: input.injectedHeadScripts,
    allStarterStylesCss: ALL_STARTER_STYLES_CSS,
  })
}
