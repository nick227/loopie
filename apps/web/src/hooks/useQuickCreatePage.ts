import { useNavigate } from 'react-router-dom'
import { useCreateLandingPage, useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'

/**
 * The "New page" action, factored out so it can be triggered from more than one place (the Pages
 * list's own button, the global Create action sheet, and the Pages list's purpose-driven starting
 * points — see PagesStartRow) without duplicating the template-pick logic. `create()` with no
 * argument keeps the old generic behavior (a sensible default starter template, for callers that
 * don't care which); passing a `templateId` creates from that specific template instead, for
 * callers that already know the purpose the user picked.
 */
export function useQuickCreatePage() {
  const navigate = useNavigate()
  const templatesQuery = useLandingPageTemplates()
  const templates = useFlatPages(templatesQuery)
  const createPage = useCreateLandingPage()

  async function create(
    templateId?: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const template = templateId
      ? templates.find((item) => item.id === templateId)
      : (templates.find(
          (item) =>
            item.id === 'system-template-corporate-professional' || item.name === 'Homepage',
        ) ?? templates[0])

    if (!template) {
      return { ok: false, message: 'A starter layout could not be loaded. Refresh and try again.' }
    }

    const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const result = await createPage.mutateAsync({
        templateId: template.id,
        name: 'Untitled page',
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
