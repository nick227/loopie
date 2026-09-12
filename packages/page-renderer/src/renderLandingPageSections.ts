// Compatibility wrapper — this file's real content moved into core/, sections/, starters/, and
// composition/ during the Starter-extraction refactor (see this package's own README/CLAUDE.md
// entry for the full breakdown). Kept so any existing relative import of the old path (this
// package's own __tests__ included) still resolves; new code should import from the package's
// public entry (`@project/page-renderer`) or, for internal work, straight from the new modules.
export { escapeHtml, safeHttpUrl, renderCta } from './core/escape'
export type { RenderForm, RenderFormField, TemplateSection } from './core/types'
