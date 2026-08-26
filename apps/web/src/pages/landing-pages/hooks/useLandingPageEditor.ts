import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  useLandingPage,
  useLandingPageTemplate,
  useExportLandingPage,
  useUpdateLandingPage,
  usePublishLandingPage,
  useUpdateCampaign,
} from '@project/sdk'
import { SectionContent } from '../components/types'

export function useLandingPageEditor() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  const [searchParams] = useSearchParams()

  const { data: pageResult, isLoading: pageLoading } = useLandingPage(landingPageId!)
  const page = pageResult?.data
  const { data: templateResult } = useLandingPageTemplate(page?.templateId ?? '')
  const template = templateResult?.data
  const exportQuery = useExportLandingPage(landingPageId!)

  const updateMutation = useUpdateLandingPage()
  const publishMutation = usePublishLandingPage()
  const setDestinationMutation = useUpdateCampaign()

  const [content, setContent] = useState<Record<string, SectionContent>>({})
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [formId, setFormId] = useState('')
  const [dirty, setDirty] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!page) return
    // Syncing local editable state from the async-loaded page, not derivable at render time —
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(
      (page.content as { sections?: Record<string, SectionContent> } | null)?.sections ?? {},
    )
    setTheme((page.theme as Record<string, string> | null) ?? {})
    setFormId(page.formId ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id])

  useEffect(() => {
    const fid = searchParams.get('formId')
    if (fid) {
      // Reacting to a URL param set by another page (Landing Page's "attach form" flow) —
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormId(fid)
      setDirty(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleSave() {
    await updateMutation.mutateAsync({
      landingPageId: landingPageId!,
      content: { sections: content },
      theme,
      formId: formId || null,
    })
    setDirty(false)
    setSavedAt(Date.now())
    exportQuery.refetch()
  }

  async function handlePublish() {
    if (dirty) await handleSave()
    await publishMutation.mutateAsync(landingPageId!)
  }

  async function handleSetDestination() {
    if (!campaignId || !page) return
    await setDestinationMutation.mutateAsync({ campaignId, destinationUrl: page.hostedUrl })
  }

  return {
    landingPageId,
    page,
    pageLoading,
    template,
    exportQuery,
    updateMutation,
    publishMutation,
    setDestinationMutation,
    content,
    setContent,
    theme,
    setTheme,
    formId,
    setFormId,
    dirty,
    setDirty,
    campaignId,
    setCampaignId,
    savedAt,
    handleSave,
    handlePublish,
    handleSetDestination,
  }
}
