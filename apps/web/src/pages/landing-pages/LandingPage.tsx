import { Link } from 'react-router-dom'
import { useForms } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ExternalLink, LayoutGrid, Rocket, Rows3 } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { PageCanvas } from './components/PageCanvas'
import { PageToolbar } from './components/PageToolbar'
import { TemplateSection } from './components/types'
import { useLandingPageEditor } from './hooks/useLandingPageEditor'

export function LandingPage() {
  const {
    page,
    pageLoading,
    pageError,
    refetchPage,
    template,
    templateId,
    setTemplateId,
    publishMutation,
    content,
    setContent,
    theme,
    setTheme,
    formId,
    setFormId,
    fields,
    setFields,
    submitLabel,
    slots,
    setSlots,
    dirty,
    setDirty,
    savedAt,
    saveError,
    handlePublish,
  } = useLandingPageEditor()
  const formsQuery = useForms({ limit: 100 })
  const forms = useFlatPages(formsQuery)

  if (pageLoading && !page) return <Skeleton className="h-64 w-full" />
  if (pageError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
        <h1 className="font-semibold">Page unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">This Page could not be loaded.</p>
        <button
          type="button"
          onClick={() => refetchPage()}
          className="mt-3 text-sm underline underline-offset-4"
        >
          Retry
        </button>
      </div>
    )
  }
  if (!page) return <p className="text-muted-foreground">Not found.</p>

  const sections: TemplateSection[] = [
    ...((template?.schema as { sections?: TemplateSection[] })?.sections ?? []),
  ].sort((a, b) => a.order - b.order)

  const previewHref = page.previewUrl

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/landing-pages"
            className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            Pages
          </Link>
          <h1 className="text-xl font-semibold">{page.name}</h1>
          {page.status === 'PUBLISHED' ? (
            <p className="text-xs text-muted-foreground">
              Live at{' '}
              <a href={page.hostedUrl} target="_blank" rel="noreferrer" className="underline">
                {page.hostedUrl}
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Draft</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : savedAt ? (
            <span className="text-xs text-muted-foreground">Saved</span>
          ) : null}
          <Button
            variant="outline"
            disabled={dirty}
            onClick={() => window.open(previewHref, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={14} /> Preview
          </Button>
          <Button onClick={handlePublish} loading={publishMutation.isPending}>
            <Rocket size={14} /> Publish
          </Button>
        </div>
      </div>

      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {saveError}
        </p>
      )}

      <ol
        aria-label="Page publishing workflow"
        className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center rounded-xl border border-border bg-card px-3 py-3 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:px-5 sm:text-xs"
      >
        <li className="text-foreground">Page</li>
        <li aria-hidden="true">→</li>
        <li>Ad spaces</li>
        <li aria-hidden="true">→</li>
        <li>Form</li>
        <li aria-hidden="true">→</li>
        <li>Publish</li>
      </ol>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="page-form" className="text-xs font-medium text-muted-foreground">
            Reusable form
          </label>
          <select
            id="page-form"
            value={formId}
            disabled={formsQuery.isLoading || formsQuery.isError}
            onChange={(event) => {
              setFields([])
              setFormId(event.target.value)
              setDirty(true)
            }}
            className="mt-1 flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No form embedded</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
          {formsQuery.isError && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              Forms could not be loaded.
            </p>
          )}
        </div>
        <div className="flex min-h-9 items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Rows3 size={14} /> {slots.length} ad {slots.length === 1 ? 'space' : 'spaces'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid size={14} /> {formId ? 'Form attached' : 'No form'}
          </span>
        </div>
        <Link to="/forms" className="text-sm font-medium underline underline-offset-4">
          Manage forms
        </Link>
      </section>

      <PageToolbar
        templateId={templateId}
        templateSchema={template?.schema}
        theme={theme}
        onTemplate={(id) => {
          setTemplateId(id)
          setDirty(true)
        }}
        onTheme={(next) => {
          setTheme(next)
          setDirty(true)
        }}
      />

      <PageCanvas
        sections={sections}
        content={content}
        theme={theme}
        slots={slots}
        hasForm={Boolean(formId)}
        formFields={fields}
        onFormFields={(next) => {
          setFields(next)
          setDirty(true)
        }}
        onSlots={(next) => {
          setSlots(next)
          setDirty(true)
        }}
        onSection={(key, next) => {
          setContent((c) => ({ ...c, [key]: next }))
          setDirty(true)
        }}
        submitLabel={submitLabel}
      />
    </div>
  )
}
