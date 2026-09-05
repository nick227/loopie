import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLandingPagePerformance } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { usePageTitle } from '@/lib/headerContext'
import { Eye, Rocket } from 'lucide-react'
import { PageCanvas } from './components/PageCanvas'
import { PageToolbar } from './components/PageToolbar'
import { LandingPageShareMenu } from './components/LandingPageShareMenu'
import { EmbedModal } from '@/components/shared/EmbedModal'
import { RICH_TEMPLATE_IDS, type TemplateSection } from './components/types'
import { useLandingPageEditor } from './hooks/useLandingPageEditor'
import { AdvancedTemplateRenderer } from './components/AdvancedTemplateRenderer'
import { ContentView } from './components/ContentView'

type Tab = 'editor' | 'content' | 'activity'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// Real, existing data (GET /landing-pages/{id}/performance) — not new backend surface. There's no
// GET submissions-list endpoint yet (only the public POST that creates one), so this is an
// honest aggregate summary, not a fabricated activity feed.
function PageActivity({ landingPageId }: { landingPageId: string }) {
  const query = useLandingPagePerformance(landingPageId)
  if (query.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  const perf = query.data?.data
  if (!perf)
    return <p className="text-sm text-muted-foreground">Performance could not be loaded.</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Views" value={String(perf.views)} />
      <Stat label="Unique sessions" value={String(perf.uniqueSessions)} />
      <Stat label="Form starts" value={String(perf.formStarts)} />
      <Stat label="Submissions" value={String(perf.submissions)} />
      <Stat
        label="Conversion rate"
        value={perf.conversionRate != null ? `${(perf.conversionRate * 100).toFixed(1)}%` : '—'}
      />
      <Stat label="Leads" value={String(perf.leads)} />
      <Stat label="Sales" value={String(perf.sales)} />
      <Stat label="Revenue" value={`$${(perf.revenue ?? 0).toLocaleString()}`} />
    </div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('content')
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const {
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
    formId,
    setFormId,
    fields,
    setFields,
    submitLabel,
    setSubmitLabel,
    successMessage,
    setSuccessMessage,
    slots,
    setSlots,
    dirty,
    publishPending,
    setDirty,
    saveError,
    handlePublish,
  } = useLandingPageEditor()
  usePageTitle(name || null)
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

  // Form is a page-level attachment (Form.formId), not a template-schema section — its own
  // Content-tab row (see ContentView) shares the exact same layoutConfig 'form' key every plain
  // template's real form-embed schema section already uses, so hiding it here genuinely hides the
  // block on those templates too. Rich templates have no independent form-embed section (the form
  // lives inside their footer/contact section) — hasForm is the only lever they read, so gating it
  // here is what makes "hide" do something real there as well.
  const formHidden = layoutConfig.sections?.form?.hidden ?? false
  const hasForm = Boolean(formId) && !formHidden

  const previewHref = page.previewUrl

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{name || 'Landing page editor'}</h1>
      {/* No "‹ Pages" link here — the persistent header (Shell.tsx) already shows it as the Back
          affordance for this entity. A second one here would be exactly the duplicate chrome the
          Singleton/Collection/Entity grammar (docs/strategy/03-product-principles.md) argues
          against. */}
      <div className="relative z-20 border-y border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-12 max-w-[900px] flex-wrap flex-col items-center gap-2 px-3 py-2 lg:flex-nowrap lg:px-0">
          <div className="flex w-full">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setDirty(true)
              }}
              onBlur={() => {
                if (!name.trim()) setName(page.name)
              }}
              aria-label="Internal page name"
              maxLength={150}
              className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-foreground hover:border-input-border focus:border-input-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex w-full justify-between pt-2">
            <EntityTabs<Tab>
              compact
              tabs={[
                { key: 'content', label: 'Content' },
                { key: 'editor', label: 'Editor' },
                { key: 'activity', label: 'Activity' },
              ]}
              active={tab}
              onChange={setTab}
            />

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 px-2"
                disabled={dirty}
                onClick={() => window.open(previewHref, '_blank', 'noopener,noreferrer')}
                aria-label="Preview draft"
                title={dirty ? 'Wait for changes to save before previewing' : 'Preview draft'}
              >
                <Eye size={14} /> Preview
              </Button>
              <LandingPageShareMenu
                hostedUrl={page.hostedUrl ?? ''}
                published={page.status === 'PUBLISHED' && Boolean(page.hostedUrl)}
                onEmbed={() => setEmbedModalOpen(true)}
              />
              <Button
                size="sm"
                onClick={handlePublish}
                loading={publishMutation.isPending}
                disabled={!publishPending}
                title={publishPending ? 'Publish the latest changes' : 'No unpublished changes'}
              >
                <Rocket size={14} /> Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EmbedModal
        isOpen={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        objectType="PAGE"
        objectId={page.id}
      />

      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm max-w-[900px] mx-auto"
        >
          {saveError}
        </p>
      )}

      {tab === 'editor' ? (
        <div>
          <div
            role="toolbar"
            aria-label="Page appearance"
            className="flex min-h-10 items-center justify-center rounded-t-xl border border-b-0 border-input-border bg-muted/45 px-2 py-1"
          >
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
          </div>

          <div className="[&>div]:rounded-t-none relative z-0">
            {RICH_TEMPLATE_IDS.includes(templateId) ? (
              <AdvancedTemplateRenderer
                templateId={templateId}
                content={content}
                theme={theme}
                layoutConfig={layoutConfig}
                hasForm={hasForm}
                formFields={fields}
                submitLabel={submitLabel}
                submissionCount={page.submissionCount}
                onSlot={(slotGroup, next) => {
                  setContent((c) => ({ ...c, [slotGroup]: next }))
                  setDirty(true)
                }}
                onFormFields={(next) => {
                  setFields(next)
                  setDirty(true)
                }}
              />
            ) : (
              <PageCanvas
                sections={sections}
                content={content}
                layoutConfig={layoutConfig}
                theme={theme}
                slots={slots}
                hasForm={hasForm}
                formFields={fields}
                onFormFields={(next) => {
                  setFields(next)
                  setDirty(true)
                }}
                onSlots={(next) => {
                  setSlots(next)
                  setDirty(true)
                }}
                onSlot={(slotGroup, next) => {
                  setContent((c) => ({ ...c, [slotGroup]: next }))
                  setDirty(true)
                }}
                submitLabel={submitLabel}
              />
            )}
          </div>
        </div>
      ) : tab === 'content' ? (
        <div className="mx-auto w-full max-w-[900px]">
          <ContentView
            content={content}
            sections={sections}
            layoutConfig={layoutConfig}
            formId={formId}
            submitLabel={submitLabel}
            successMessage={successMessage}
            onBrowserSettings={(next) => {
              setContent((c) => ({ ...c, browser: next }))
              setDirty(true)
            }}
            onSlot={(slotGroup, next) => {
              setContent((c) => ({ ...c, [slotGroup]: next }))
              setDirty(true)
            }}
            onLayoutConfig={(next) => {
              setLayoutConfig(next)
              setDirty(true)
            }}
            onSubmitLabel={(value) => {
              setSubmitLabel(value)
              setDirty(true)
            }}
            onSuccessMessage={(value) => {
              setSuccessMessage(value)
              setDirty(true)
            }}
            onDetachForm={() => {
              setFormId('')
              setDirty(true)
            }}
            onAddForm={() => navigate(`/forms/new?returnTo=/landing-pages/${page.id}`)}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[900px]">
          <PageActivity landingPageId={page.id} />
        </div>
      )}
    </div>
  )
}
