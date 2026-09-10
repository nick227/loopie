/**
 * Known business facts available when seeding a new page's starter content — same "a real fact
 * outranks generic copy, a missing one falls back to the crafted default" idiom already proven in
 * packages/ad-renderer's StarterBusiness for the Ads catalog. Deliberately narrow: only fields
 * with an honest, non-fabricated mapping into a template's identity/pitch slots (name/tagline/
 * description). Section content that would require inventing specific facts — testimonials,
 * metrics, product catalogs, team bios — is never substituted; those stay hand-authored example
 * copy the business is expected to replace.
 */
export type StarterPageBusiness = {
  name: string
  tagline?: string | null
  description?: string | null
}
