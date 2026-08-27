import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Rocket } from 'lucide-react'
import { PageCanvas } from './components/PageCanvas'
import { PageToolbar } from './components/PageToolbar'
import { TemplateSection } from './components/types'
import { useLandingPageEditor } from './hooks/useLandingPageEditor'

export function LandingPage() {
  const {
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
  } = useLandingPageEditor()

  if (pageLoading) return <Skeleton className="h-64 w-full" />
  if (!page) return <p className="text-muted-foreground">Not found.</p>

  const sections: TemplateSection[] = [
    ...((template?.schema as { sections?: TemplateSection[] })?.sections ?? []),
  ].sort((a, b) => a.order - b.order)
  const themeTokens: string[] = (template?.schema as { themeTokens?: string[] })?.themeTokens ?? []

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
          <p className="text-xs text-muted-foreground">
            {page.status === 'PUBLISHED' ? 'Live at ' : 'Draft — will publish to '}
            <a href={page.hostedUrl} target="_blank" rel="noreferrer" className="underline">
              {page.hostedUrl}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !dirty && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button
            variant="outline"
            onClick={handleSave}
            loading={updateMutation.isPending || replaceSlots.isPending}
            disabled={!dirty}
          >
            Save Draft
          </Button>
          <Button onClick={handlePublish} loading={publishMutation.isPending}>
            <Rocket size={14} /> Publish
          </Button>
        </div>
      </div>

      <PageToolbar
        templateId={templateId}
        theme={theme}
        themeTokens={themeTokens}
        published={page.status === 'PUBLISHED'}
        campaignId={campaignId}
        destinationPending={setDestinationMutation.isPending}
        destinationOk={setDestinationMutation.isSuccess}
        onTemplate={(id) => {
          setTemplateId(id)
          setDirty(true)
        }}
        onTheme={(token, value) => {
          setTheme((t) => ({ ...t, [token]: value }))
          setDirty(true)
        }}
        onCampaign={setCampaignId}
        onSetDestination={handleSetDestination}
      />

      <PageCanvas
        sections={sections}
        content={content}
        theme={theme}
        slots={slots}
        formFields={fields}
        submitLabel={submitLabel}
        onSection={(key, next) => {
          setContent((c) => ({ ...c, [key]: next }))
          setDirty(true)
        }}
        onFormFields={(next) => {
          setFields(next)
          setDirty(true)
        }}
        onSlots={(next) => {
          setSlots(next)
          setDirty(true)
        }}
      />
    </div>
  )
}
