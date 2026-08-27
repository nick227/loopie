import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  useLandingPage,
  useLandingPageTemplate,
  useUpdateLandingPage,
  usePublishLandingPage,
  useReplaceLandingPageAdSlots,
  useUpdateCampaign,
  useForm,
  useUpdateForm,
} from '@project/sdk'
import { SectionContent } from '../components/types'
import type { AdSlotDraft } from '../components/adSlots'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'

function toDrafts(
  fields: {
    label: string
    fieldKey: string
    type: string
    required: boolean
    options?: unknown
  }[],
): FormFieldDraft[] {
  return fields.map((field) => ({
    label: field.label,
    fieldKey: field.fieldKey,
    type: field.type as FormFieldDraft['type'],
    required: field.required,
    options: Array.isArray(field.options) ? field.options.map(String).join(', ') : '',
  }))
}

function toApiFields(fields: FormFieldDraft[]) {
  return fields.map((field, order) => ({
    label: field.label,
    fieldKey: field.fieldKey,
    type: field.type,
    required: field.required,
    order,
    options:
      field.type === 'SELECT'
        ? field.options
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
  }))
}

export function useLandingPageEditor() {
  const { landingPageId } = useParams<{ landingPageId: string }>()

  const { data: pageResult, isLoading: pageLoading } = useLandingPage(landingPageId!)
  const page = pageResult?.data
  const [templateId, setTemplateId] = useState('')
  const { data: templateResult } = useLandingPageTemplate(templateId)
  const template = templateResult?.data

  const updateMutation = useUpdateLandingPage()
  const publishMutation = usePublishLandingPage()
  const replaceSlots = useReplaceLandingPageAdSlots(landingPageId!)
  const setDestinationMutation = useUpdateCampaign()
  const updateForm = useUpdateForm()

  const [content, setContent] = useState<Record<string, SectionContent>>({})
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [formId, setFormId] = useState('')
  const [fields, setFields] = useState<FormFieldDraft[]>([])
  const [submitLabel, setSubmitLabel] = useState('Get in touch')
  const [slots, setSlots] = useState<AdSlotDraft[]>([])
  const [dirty, setDirty] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const formQuery = useForm(formId)

  useEffect(() => {
    if (!page) return
    // Syncing local editable state from the async-loaded page, not derivable at render time —
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(
      (page.content as { sections?: Record<string, SectionContent> } | null)?.sections ?? {},
    )
    setTheme((page.theme as Record<string, string> | null) ?? {})
    setFormId(page.formId ?? '')
    setTemplateId(page.templateId)
    setSlots(
      (page.slots ?? []).map((slot) => ({
        placement: slot.placement,
        adUnitId: slot.adUnitId ?? null,
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id])

  useEffect(() => {
    const form = formQuery.data?.data
    if (!form) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields(toDrafts(form.fields ?? []))
    setSubmitLabel(form.submitLabel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formQuery.data?.data?.id])

  useEffect(() => {
    const sections = (template?.schema as { sections?: { key: string }[] } | undefined)?.sections
    if (!sections) return
    // Merge newly visible template keys without rewriting existing section content —
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent((current) => {
      const next = { ...current }
      let changed = false
      for (const section of sections) {
        if (!next[section.key]) {
          next[section.key] = { hidden: false }
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [template?.id, template?.schema])

  async function handleSave() {
    await updateMutation.mutateAsync({
      landingPageId: landingPageId!,
      content: { sections: content },
      theme,
      templateId: templateId || undefined,
      formId: formId || null,
    })
    await replaceSlots.mutateAsync(slots)
    if (formId) {
      await updateForm.mutateAsync({
        formId,
        submitLabel,
        fields: toApiFields(fields),
      })
    }
    setDirty(false)
    setSavedAt(Date.now())
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
    templateId,
    setTemplateId,
    updateMutation,
    publishMutation,
    replaceSlots,
    setDestinationMutation,
    content,
    setContent,
    theme,
    setTheme,
    formId,
    fields,
    setFields,
    submitLabel,
    slots,
    setSlots,
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
