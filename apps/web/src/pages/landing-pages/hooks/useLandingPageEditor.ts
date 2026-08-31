import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  useLandingPage,
  useLandingPageTemplate,
  useUpdateLandingPage,
  usePublishLandingPage,
  useReplaceLandingPageAdSlots,
  useForm,
  useUpdateForm,
} from '@project/sdk'
import { SectionContent } from '../components/types'
import type { AdSlotDraft } from '../components/adSlots'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { hydratePageSections } from './hydratePageSections'

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

  const {
    data: pageResult,
    isLoading: pageLoading,
    isError: pageError,
    refetch: refetchPage,
  } = useLandingPage(landingPageId!)
  const page = pageResult?.data
  const [templateId, setTemplateId] = useState('')
  const { data: templateResult } = useLandingPageTemplate(templateId)
  const template = templateResult?.data

  const updateMutation = useUpdateLandingPage()
  const publishMutation = usePublishLandingPage()
  const replaceSlots = useReplaceLandingPageAdSlots(landingPageId!)
  const updateForm = useUpdateForm()
  const updatePage = updateMutation.mutateAsync
  const saveSlots = replaceSlots.mutateAsync
  const saveForm = updateForm.mutateAsync

  const [content, setContent] = useState<Record<string, SectionContent>>({})
  const [name, setName] = useState('')
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [formId, setFormId] = useState('')
  const [fields, setFields] = useState<FormFieldDraft[]>([])
  const [submitLabel, setSubmitLabel] = useState('Get in touch')
  const [slots, setSlots] = useState<AdSlotDraft[]>([])
  const [dirty, setDirty] = useState(false)
  const [publishPending, setPublishPending] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const writes = useRef(Promise.resolve())
  const generation = useRef(0)

  const formQuery = useForm(formId)
  const hydratedPageId = useRef<string | null>(null)
  const hydratedFormId = useRef<string | null>(null)

  useEffect(() => {
    if (!page || hydratedPageId.current === page.id) return
    hydratedPageId.current = page.id
    setName(page.name)
    setPublishPending(page.status !== 'PUBLISHED')
    setContent(
      (page.content as { sections?: Record<string, SectionContent> } | null)?.sections ?? {},
    )
    setTheme((page.theme as Record<string, string> | null) ?? {})
    setFormId(page.formId ?? '')
    setTemplateId(page.templateId)
    setSlots(
      (page.slots ?? []).map((slot) => ({
        placement: slot.placement,
        adUnitId: slot.assignments?.[0]?.adRunId ?? null,
      })),
    )
  }, [page])

  useEffect(() => {
    const form = formQuery.data?.data
    if (!form || hydratedFormId.current === form.id) return
    hydratedFormId.current = form.id
    setFields(toDrafts(form.fields ?? []))
    setSubmitLabel(form.submitLabel)
  }, [formQuery.data?.data])

  useEffect(() => {
    const sections = (template?.schema as { sections?: { key: string }[] } | undefined)?.sections
    if (!sections) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent((current) => hydratePageSections(current, sections))
  }, [template?.id, template?.schema])

  const persist = useCallback(async () => {
    if (!landingPageId || !name.trim()) return
    setSaveError(null)
    const mine = generation.current
    const job = async () => {
      await updatePage({
        landingPageId,
        name: name.trim(),
        content: { sections: content },
        theme,
        templateId: templateId || undefined,
        formId: formId || null,
      })
      await saveSlots(slots)
      if (formId && hydratedFormId.current === formId) {
        await saveForm({
          formId,
          submitLabel,
          fields: toApiFields(fields),
        })
      }
      if (generation.current !== mine) return
      setDirty(false)
      setSavedAt(Date.now())
    }
    const next = writes.current.then(job, job)
    writes.current = next
    try {
      await next
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : 'Your Page changes could not be saved. Check your connection and try again.'
      setSaveError(message)
      throw cause
    }
  }, [
    landingPageId,
    name,
    content,
    theme,
    templateId,
    formId,
    slots,
    submitLabel,
    fields,
    updatePage,
    saveSlots,
    saveForm,
  ])

  useEffect(() => {
    if (!dirty || !name.trim()) return
    const timer = window.setTimeout(() => {
      void persist().catch(() => undefined)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [dirty, name, persist])

  function markDirty(_dirty?: boolean) {
    generation.current += 1
    setDirty(true)
    setPublishPending(true)
  }

  async function handlePublish() {
    setSaveError(null)
    try {
      await persist()
    } catch {
      return
    }
    try {
      await publishMutation.mutateAsync(landingPageId!)
      setPublishPending(false)
    } catch {
      setSaveError('This Page could not be published. Your saved draft is still available.')
    }
  }

  return {
    page,
    pageLoading,
    pageError,
    refetchPage,
    template,
    templateId,
    setTemplateId,
    publishMutation,
    name,
    setName,
    content,
    setContent,
    theme,
    setTheme,
    fields,
    setFields,
    submitLabel,
    formId,
    setFormId,
    slots,
    setSlots,
    dirty,
    publishPending,
    setDirty: markDirty,
    savedAt,
    saveError,
    handlePublish,
  }
}
