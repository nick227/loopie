import { useState } from 'react'
import { useLandingPagePerformance } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EntityTabs } from '@/components/ui/EntityTabs'
import { usePageTitle } from '@/lib/headerContext'
import { Code2, ExternalLink, Rocket } from 'lucide-react'
import { PageCanvas } from './components/PageCanvas'
import { PageToolbar } from './components/PageToolbar'
import { TemplateSection } from './components/types'
import { useLandingPageEditor } from './hooks/useLandingPageEditor'
import { AdvancedTemplateRenderer } from './components/AdvancedTemplateRenderer'

type Tab = 'editor' | 'activity'

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
    formId,
    fields,
    setFields,
    submitLabel,
    slots,
    setSlots,
    dirty,
    publishPending,
    setDirty,
    savedAt,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          {page.status === 'PUBLISHED' ? (
            <p className="text-xs text-muted-foreground">
              Page URL:{' '}
              <a href={page.hostedUrl} target="_blank" rel="noreferrer" className="underline">
                {page.hostedUrl}
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Page URL: <span className="font-mono">{page.hostedUrl}</span> · available after
              publishing
            </p>
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
          {/* Placeholder for docs/architecture/embeddable-published-objects-v1.md's embed runtime —
              not built yet (no EmbedDeployment model, no /v1/embeds route). Held here, disabled,
              so the Page entity's action contract already has this slot and doesn't need
              restructuring once the runtime ships. */}
          <Button variant="outline" disabled title="Embed is coming soon">
            <Code2 size={14} /> Embed
          </Button>
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
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {saveError}
        </p>
      )}

      {/* Entity-local sections (docs/strategy/03-product-principles.md) — Editor is this page's
          own draft/content work, Activity is real performance data (GET /landing-pages/{id}/
          performance) that had nowhere to live on this screen before. Plain local state, not
          routes — nothing here needs its own URL or Back-stack entry. */}
      <EntityTabs<Tab>
        tabs={[
          { key: 'editor', label: 'Editor' },
          { key: 'activity', label: 'Activity' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'editor' ? (
        <>
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

          {template?.schema && 'blocks' in template.schema ? (
            <AdvancedTemplateRenderer
              templateId={templateId}
              content={content}
              setContent={setContent as any}
              setDirty={setDirty}
            />
          ) : (
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
          )}
        </>
      ) : (
        <PageActivity landingPageId={page.id} />
      )}
    </div>
  )
}
