import { useState } from 'react'
import { useLandingPagePerformance } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { usePageTitle } from '@/lib/headerContext'
import { Check, Eye, Loader2, Rocket } from 'lucide-react'
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
  const [tab, setTab] = useState<Tab>('editor')
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
    fields,
    setFields,
    submitLabel,
    slots,
    setSlots,
    dirty,
    savedAt,
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

  const previewHref = page.previewUrl

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{name || 'Landing page editor'}</h1>
      {/* No "‹ Pages" link here — the persistent header (Shell.tsx) already shows it as the Back
          affordance for this entity. A second one here would be exactly the duplicate chrome the
          Singleton/Collection/Entity grammar (docs/strategy/03-product-principles.md) argues
          against. */}
      <div className="sticky top-14 z-20 border-y border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-12 max-w-[900px] flex-wrap items-center gap-2 px-3 py-2 lg:flex-nowrap lg:px-0">
          <div className="flex min-w-[10rem] flex-1 items-center gap-1.5 lg:max-w-[13rem]">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setDirty(true)
              }}
              onBlur={() => {
                if (!name.trim()) setName(page.name)
              }}
              aria-label="Page title"
              maxLength={150}
              className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-foreground hover:border-input-border focus:border-input-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {dirty || savedAt ? (
              <span
                aria-live="polite"
                title={dirty ? 'Saving changes' : 'Changes saved'}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
              >
                {dirty ? (
                  <Loader2 size={12} aria-hidden="true" className="animate-spin" />
                ) : (
                  <Check size={12} aria-hidden="true" className="text-success" />
                )}
                <span className="sr-only xl:not-sr-only">{dirty ? 'Saving…' : 'Saved'}</span>
              </span>
            ) : null}
          </div>

          <EntityTabs<Tab>
            compact
            tabs={[
              { key: 'editor', label: 'Editor' },
              { key: 'content', label: 'Content' },
              { key: 'activity', label: 'Activity' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'editor' ? (
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
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={dirty}
              onClick={() => window.open(previewHref, '_blank', 'noopener,noreferrer')}
              aria-label="Preview draft"
              title={dirty ? 'Wait for changes to save before previewing' : 'Preview draft'}
            >
              <Eye size={14} />
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
        <>
          {RICH_TEMPLATE_IDS.includes(templateId) ? (
            <AdvancedTemplateRenderer
              templateId={templateId}
              content={content}
              theme={theme}
              layoutConfig={layoutConfig}
              hasForm={Boolean(formId)}
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
              onSlot={(slotGroup, next) => {
                setContent((c) => ({ ...c, [slotGroup]: next }))
                setDirty(true)
              }}
              submitLabel={submitLabel}
            />
          )}
        </>
      ) : tab === 'content' ? (
        <div className="mx-auto w-full max-w-[900px]">
          <ContentView
            content={content}
            sections={sections}
            layoutConfig={layoutConfig}
            onSlot={(slotGroup, next) => {
              setContent((c) => ({ ...c, [slotGroup]: next }))
              setDirty(true)
            }}
            onLayoutConfig={(next) => {
              setLayoutConfig(next)
              setDirty(true)
            }}
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
