import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useLandingPage, usePublishLandingPage, useUpdateLandingPage } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { STEP_COPY } from '../copy'
import type { PageContent } from '@/pages/landing-pages/components/types'

// Generalized from the original homepage-only publish step: routes both `homepage_publish` and
// `page_publish` here, differentiated only by whether `pageName` is passed. Also hosts an
// optional, collapsed-by-default "Customize headline & CTA" companion — the same pattern proven
// by the business-info step (missing/editable fields -> real operation -> live recompute) applied
// to page content, via the exact operation the real editor itself uses (useUpdateLandingPage,
// sending only `content` — a genuine partial update, see UpdateLandingPageInput). Deliberately
// does not gate Publish: there's no reliable signal for "this content still looks unedited" worth
// building a detector for, so this stays optional rather than blocking.
export function AssistantPagePublishStep({
  landingPageId,
  pageName,
  onSuccess,
}: {
  landingPageId: string
  pageName?: string
  onSuccess: () => void
}) {
  const publish = usePublishLandingPage()
  const page = useLandingPage(landingPageId)
  const updateContent = useUpdateLandingPage()
  const [expanded, setExpanded] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [headline, setHeadline] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [saved, setSaved] = useState(false)

  const content = (page.data?.data?.content ?? {}) as PageContent

  // Hydrate the fields once, when the page first loads — adjusted during render (guarded by
  // `hydrated`), not in an effect, so typing in the fields afterward doesn't get clobbered by a
  // refetch, and there's no extra commit for a value that's only ever set once.
  if (!hydrated && page.data?.data) {
    setHydrated(true)
    setHeadline(content.hero?.headline ?? '')
    setCtaLabel(content.hero?.primaryCta?.label ?? '')
    setCtaUrl(content.hero?.primaryCta?.url ?? '')
  }

  async function handleSaveContent() {
    await updateContent.mutateAsync({
      landingPageId,
      content: {
        ...content,
        hero: { ...content.hero, headline, primaryCta: { label: ctaLabel, url: ctaUrl } },
      },
    })
    setSaved(true)
  }

  async function handlePublish() {
    await publish.mutateAsync(landingPageId)
    onSuccess()
  }

  const actionLabel = pageName
    ? STEP_COPY.page_publish.actionLabel
    : STEP_COPY.homepage_publish.actionLabel

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Customize headline &amp; CTA
      </button>
      {expanded ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Headline</label>
            <Input
              value={headline}
              onChange={(e) => {
                setHeadline(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Button text</label>
            <Input
              value={ctaLabel}
              onChange={(e) => {
                setCtaLabel(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Button link</label>
            <Input
              value={ctaUrl}
              onChange={(e) => {
                setCtaUrl(e.target.value)
                setSaved(false)
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveContent}
            loading={updateContent.isPending}
          >
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      ) : null}
      <Button onClick={handlePublish} loading={publish.isPending} className="w-full">
        {actionLabel}
      </Button>
    </div>
  )
}
