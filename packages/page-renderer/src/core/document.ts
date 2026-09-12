import { escapeHtml } from './escape'
import { themeVariablesCss, type ResolvedTheme } from './theme'
import { baseSectionStylesCss, SHARED_RESPONSIVE_CSS } from './baseStyles'
import { LAYOUT_VARIANT_CSS, GRID_TOKENS_CSS } from '@project/page-layout'
import type { StarterRendererId } from './types'

export interface DocumentInput {
  pageTitle: string
  faviconUrl: string
  theme: ResolvedTheme
  starterId: StarterRendererId
  layoutVariantAttr: string
  bodyHtml: string
  behaviorScripts: string[]
  runtimeHtml: string
  injectedHeadScripts?: string
  // Every registered Starter's own skin CSS, concatenated in a fixed order — always shipped in
  // full regardless of which one is active on this page (only the current `lp-template-{id}` body
  // class actually matches any of it), preserving the pre-extraction stylesheet byte-for-byte
  // rather than introducing a new "only ship the active skin" behavior this refactor never asked
  // for. See starters/registry.ts.
  allStarterStylesCss: string
}

export function renderDocument(input: DocumentInput): string {
  const { theme } = input
  const faviconHtml = input.faviconUrl
    ? `<link rel="icon" href="${escapeHtml(input.faviconUrl)}" />\n`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.pageTitle)}</title>
${faviconHtml}<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?${escapeHtml(theme.googleFonts)}&display=swap" rel="stylesheet" />
<style>
:root { ${themeVariablesCss(theme)} }
${GRID_TOKENS_CSS}
${baseSectionStylesCss(theme.fontFamily)}

/* Rich-template parity. The editor and published document share the renderer identity stored in
   the template schema; these rules mirror the layout vocabulary of the editable React canvases. */
${input.allStarterStylesCss}

${SHARED_RESPONSIVE_CSS}

${LAYOUT_VARIANT_CSS}
</style>
${input.injectedHeadScripts ?? ''}
</head>
<body class="lp-template-${escapeHtml(input.starterId)}" data-lp-layout="${escapeHtml(input.layoutVariantAttr)}">
${input.bodyHtml}
${input.behaviorScripts.join('\n')}
${input.runtimeHtml}
</body>
</html>`
}
