import { useNavigate } from 'react-router-dom'
import { useCreateLandingPage, useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'

/**
 * The "New page" action, factored out so it can be triggered from more than one place (the Pages
 * list's own button, and the global Create action sheet) without duplicating the template-pick
 * logic. Picks a sensible default starter template — a real, if minimal, creation flow, not a
 * placeholder.
 */
export function useQuickCreatePage() {
  const navigate = useNavigate()
  const templatesQuery = useLandingPageTemplates()
  const templates = useFlatPages(templatesQuery)
  const createPage = useCreateLandingPage()

  async function create(): Promise<{ ok: true } | { ok: false; message: string }> {
    const template =
      templates.find(
        (item) =>
          item.id === 'system-template-lead-gen' ||
          item.name === 'Sales page' ||
          item.name === 'Simple Lead Gen',
      ) ?? templates[0]

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
