import { useState } from 'react'
import { useLandingPagePerformance } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { usePageTitle } from '@/lib/headerContext'
import { Code2, ExternalLink, Rocket } from 'lucide-react'
import { PageCanvas } from './components/PageCanvas'
import { PageToolbar } from './components/PageToolbar'
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
      {/* No "‹ Pages" link here — the persistent header (Shell.tsx) already shows it as the Back
          affordance for this entity. A second one here would be exactly the duplicate chrome the
          Singleton/Collection/Entity grammar (docs/strategy/03-product-principles.md) argues
          against. */}
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[900px] mx-auto">
        <div>
          <h1>
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
              className="-ml-1 block min-w-0 max-w-full rounded-md border border-transparent bg-transparent px-1 text-xl font-semibold text-foreground hover:border-input-border focus:border-input-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={dirty}
            onClick={() => window.open(previewHref, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={14} /> Preview
          </Button>
          <Button
            variant="outline"
            disabled={page.status === 'PUBLISHED'}
            onClick={() => window.open(page.hostedUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={14} /> URL
          </Button>
          {/* Render the Embed modal if the button is clicked */}
          <Button
            variant="outline"
            onClick={() => setEmbedModalOpen(true)}
            disabled={page?.status !== 'PUBLISHED'}
          >
            <Code2 size={14} /> Embed
          </Button>
          <EmbedModal
            isOpen={embedModalOpen}
            onClose={() => setEmbedModalOpen(false)}
            objectType="PAGE"
            objectId={page?.id || 'loading'}
          />
          <Button
            onClick={handlePublish}
            loading={publishMutation.isPending}
            disabled={!publishPending}
            title={publishPending ? 'Publish the latest changes' : 'No unpublished changes'}
          >
            <Rocket size={14} /> Publish
          </Button>
        </div>
      </div>

      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm max-w-[900px] mx-auto"
        >
          {saveError}
        </p>
      )}

      <div className="max-w-[900px] mx-auto">
        {/* Entity-local sections (docs/strategy/03-product-principles.md) — Editor is this page's
          own draft/content work, Activity is real performance data (GET /landing-pages/{id}/
          performance) that had nowhere to live on this screen before. Plain local state, not
          routes — nothing here needs its own URL or Back-stack entry. */}
        <EntityTabs<Tab>
          tabs={[
            { key: 'editor', label: 'Editor' },
            { key: 'content', label: 'Content' },
            { key: 'activity', label: 'Activity' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'editor' ? (
        <>
          <div className="max-w-[900px] mx-auto flow">
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
