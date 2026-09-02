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
import {
  normalizeLegacyPageContent,
  DEFAULT_PAGE_FAVICON_URL,
  type PageContent,
  type LayoutConfig,
  type TemplateSection,
} from '../components/types'
import type { AdSlotDraft } from '../components/adSlots'
import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'

function toDrafts(
  fields: {
    label: string
    fieldKey: string
    type: string
    required: boolean
    options?: unknown
    defaultValue?: string | null
  }[],
): FormFieldDraft[] {
  return fields.map((field) => ({
    label: field.label,
    fieldKey: field.fieldKey,
    type: field.type as FormFieldDraft['type'],
    required: field.required,
    options: Array.isArray(field.options) ? field.options.map(String).join(', ') : '',
    defaultValue: field.defaultValue ?? '',
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
    defaultValue: field.type === 'HIDDEN' ? (field.defaultValue ?? '') : undefined,
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

  // Canonical content — shared across every template, keyed by semantic slot group (hero,
  // features, footer, ...), never a per-template shape. See apps/web/.../components/types.ts and
  // packages/db/src/content.ts. layoutConfig is presentation only (section visibility/order),
  // kept entirely separate from content values.
  const [content, setContent] = useState<PageContent>({})
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({})
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
    const normalizedContent = normalizeLegacyPageContent(page.content)
    setContent({
      ...normalizedContent,
      browser: {
        title: normalizedContent.browser?.title ?? page.name,
        faviconUrl: normalizedContent.browser?.faviconUrl ?? DEFAULT_PAGE_FAVICON_URL,
      },
    })
    setLayoutConfig((page.layoutConfig as LayoutConfig | null) ?? {})
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

  // A template switch never touches content — content is canonical and shared across every
  // template, so a slot group the newly-selected template doesn't render simply isn't shown,
  // never deleted. This only seeds layoutConfig defaults (visible) for sections this page has
  // never had a layoutConfig entry for. React's "adjust state while rendering" pattern (plain
  // useState comparisons, not an effect — see react-hooks/set-state-in-effect) — reads
  // `layoutConfig` directly rather than through a functional updater since render already has the
  // latest value.
  const [prevTemplateId, setPrevTemplateId] = useState(template?.id)
  const [prevTemplateSchema, setPrevTemplateSchema] = useState(template?.schema)
  if (template?.id !== prevTemplateId || template?.schema !== prevTemplateSchema) {
    setPrevTemplateId(template?.id)
    setPrevTemplateSchema(template?.schema)
    const sections = (template?.schema as { sections?: TemplateSection[] } | undefined)?.sections
    if (sections) {
      const existing = layoutConfig.sections ?? {}
      let changed = false
      const next = { ...existing }
      for (const section of sections) {
        if (next[section.key]) continue
        next[section.key] = { hidden: false, order: section.order }
        changed = true
      }
      if (changed) setLayoutConfig({ ...layoutConfig, sections: next })
    }
  }

  const persist = useCallback(async () => {
    if (!landingPageId || !name.trim()) return
    setSaveError(null)
    const mine = generation.current
    const job = async () => {
      await updatePage({
        landingPageId,
        name: name.trim(),
        content: content as Record<string, unknown>,
        theme,
        layoutConfig: layoutConfig as Record<string, unknown>,
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
    layoutConfig,
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
    layoutConfig,
    setLayoutConfig,
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
