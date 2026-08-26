import { Link } from 'react-router-dom'
import { useForms, useCampaigns } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Rocket, ExternalLink } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { SectionEditor } from './components/SectionEditor'
import { TemplateSection } from './components/types'
import { useLandingPageEditor } from './hooks/useLandingPageEditor'

export function LandingPage() {
  const {
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
  } = useLandingPageEditor()

  const formsQuery = useForms()
  const campaignsQuery = useCampaigns()
  const forms = useFlatPages(formsQuery)
  const campaigns = useFlatPages(campaignsQuery)

  if (pageLoading) return <Skeleton className="h-64 w-full" />
  if (!page) return <p className="text-muted-foreground">Not found.</p>

  const sections: TemplateSection[] = [
    ...((template?.schema as { sections?: TemplateSection[] })?.sections ?? []),
  ].sort((a, b) => a.order - b.order)
  const themeTokens: string[] = (template?.schema as { themeTokens?: string[] })?.themeTokens ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{page.name}</h1>
          <p className="text-xs text-muted-foreground">
            {page.status === 'PUBLISHED' ? 'Live at ' : 'Draft — will publish to '}
            <a href={page.hostedUrl} target="_blank" rel="noreferrer" className="underline">
              {page.hostedUrl}
            </a>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {savedAt && !dirty && <span className="text-xs text-muted-foreground">Saved</span>}
          <Button
            variant="outline"
            onClick={handleSave}
            loading={updateMutation.isPending}
            disabled={!dirty}
          >
            Save Draft
          </Button>
          <Button onClick={handlePublish} loading={publishMutation.isPending}>
            <Rocket size={14} /> Publish
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Content
          </h2>
          {sections.map((section) => (
            <SectionEditor
              key={section.key}
              section={section}
              content={content[section.key] ?? {}}
              onChange={(next) => {
                setContent((c) => ({ ...c, [section.key]: next }))
                setDirty(true)
              }}
            />
          ))}

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Theme
          </h2>
          <Card>
            <CardContent className="py-4 flex flex-col gap-3">
              {themeTokens.map((token) => (
                <div key={token} className="flex flex-col gap-1.5">
                  <label htmlFor={`lp-theme-${token}`} className="text-xs text-muted-foreground">
                    {token}
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id={`lp-theme-${token}`}
                      value={theme[token] ?? ''}
                      onChange={(e) => {
                        setTheme((t) => ({ ...t, [token]: e.target.value }))
                        setDirty(true)
                      }}
                    />
                    {/color/i.test(token) && (
                      <input
                        type="color"
                        value={
                          /^#[0-9a-f]{6}$/i.test(theme[token] ?? '') ? theme[token] : '#000000'
                        }
                        onChange={(e) => {
                          setTheme((t) => ({ ...t, [token]: e.target.value }))
                          setDirty(true)
                        }}
                        className="h-9 w-9 rounded border border-input-border shrink-0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Form
          </h2>
          <Card>
            <CardContent className="py-4 flex flex-col gap-3">
              <select
                aria-label="Form"
                value={formId}
                onChange={(e) => {
                  setFormId(e.target.value)
                  setDirty(true)
                }}
                className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No form</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <Link
                to={`/forms/new?returnTo=/landing-pages/${landingPageId}`}
                className="text-sm text-primary hover:underline self-start"
              >
                + Create a new form
              </Link>
            </CardContent>
          </Card>

          {page.status === 'PUBLISHED' && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Use as Campaign Destination
              </h2>
              <Card>
                <CardContent className="py-4 flex flex-col gap-3">
                  <select
                    aria-label="Campaign"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a campaign...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSetDestination}
                    loading={setDestinationMutation.isPending}
                    disabled={!campaignId}
                    className="self-start"
                  >
                    <ExternalLink size={14} /> Set as Destination
                  </Button>
                  {setDestinationMutation.isSuccess && (
                    <p className="text-xs text-muted-foreground">Campaign destination updated.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Live Preview
          </h2>
          <div
            className="rounded border border-input-border overflow-hidden bg-white"
            style={{ height: '70vh' }}
          >
            {exportQuery.data?.data ? (
              <iframe
                title="Landing page preview"
                srcDoc={exportQuery.data.data.html}
                className="w-full h-full"
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Reflects the last saved draft (save to refresh). This preview is fully live — submitting
            the embedded form here creates a real lead.
          </p>
        </div>
      </div>
    </div>
  )
}
