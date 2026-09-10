import { useNavigate } from 'react-router-dom'
import { useBusiness, useCreateLandingPage, useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'

/**
 * The "New page" action, factored out so it can be triggered from more than one place (the Pages
 * list's own button, the global Create action sheet, and the Pages list's purpose-driven starting
 * points — see PagesStartRow) without duplicating the template-pick logic. `create()` with no
 * argument keeps the old generic behavior (an explicit default policy, not a picker — see below);
 * passing a `templateId` creates from that specific template instead, for callers that already
 * know the purpose the user picked (PagesStartRow always does).
 *
 * Default policy (2026-09-10): the global Create -> Page sheet stays intentionally instant, per
 * docs/strategy/03-product-principles.md's "tap Create -> sheet -> choose Page -> straight into
 * the entity" rule — it does not get PagesStartRow's Page Type step. But the default it creates
 * from now goes through the real catalog (`pageType === 'HOME'`) instead of matching a hardcoded
 * template id/name, so it can't silently drift from what "Home" actually means the day a second
 * HOME-type Layout exists — see docs/strategy/pages-page-types-and-style-axes-roadmap.md. Still a
 * policy decision worth revisiting (should the instant sheet eventually route through Page Type
 * logic too?), not a claim that bypassing the catalog concept entirely is the final answer.
 */
export function useQuickCreatePage() {
  const navigate = useNavigate()
  const templatesQuery = useLandingPageTemplates()
  const templates = useFlatPages(templatesQuery)
  const createPage = useCreateLandingPage()
  const business = useBusiness().data?.data

  async function create(
    templateId?: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const template = templateId
      ? templates.find((item) => item.id === templateId)
      : (templates.find((item) => (item as { pageType?: string }).pageType === 'HOME') ??
        templates[0])

    if (!template) {
      return { ok: false, message: 'A starter layout could not be loaded. Refresh and try again.' }
    }

    // "Untitled page" told the user nothing once they had more than one draft. Business name +
    // the starter's own purpose (e.g. "Acme — Landing page") is informative from the first list
    // row, without blocking creation if the business record hasn't loaded yet.
    const name = business?.name ? `${business.name} — ${template.name}` : template.name

    const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const result = await createPage.mutateAsync({
        templateId: template.id,
        name,
        slug: `new-page-${uniquePart}`,
      })
      if (!result.data) throw new Error('The page was created without an identifier.')
      navigate(`/landing-pages/${result.data.id}`)
      return { ok: true }
    } catch (cause) {
      return {
        ok: false,
        message: cause instanceof Error ? cause.message : 'The page could not be created.',
      }
    }
  }

  return { create, isPending: createPage.isPending, templatesLoading: templatesQuery.isLoading }
}
