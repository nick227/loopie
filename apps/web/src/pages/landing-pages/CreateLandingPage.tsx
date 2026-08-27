import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateLandingPage, useLandingPageTemplates } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFlatPages } from '@/hooks/useFlatPages'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateLandingPage() {
  const navigate = useNavigate()
  const templatesQuery = useLandingPageTemplates()
  const templates = useFlatPages(templatesQuery)

  const [templateId, setTemplateId] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useCreateLandingPage()

  useEffect(() => {
    if (templateId || templates.length === 0) return
    const simple = templates.find(
      (t) => t.id === 'system-template-lead-gen' || t.name === 'Simple Lead Gen',
    )
    // Genuinely reacting to async query data arriving after mount, not derivable at render time —
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplateId(simple?.id ?? templates[0]!.id)
  }, [templates, templateId])

  async function handleSubmit() {
    setError(null)
    if (!name.trim()) return setError('Name is required.')
    if (!slug.trim()) return setError('Slug is required.')
    if (!templateId) return setError('Choose a template.')

    try {
      const result = await mutation.mutateAsync({ templateId, name, slug })
      if (!result.data) throw new Error('The landing page was created without an identifier.')
      navigate(`/landing-pages/${result.data.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The landing page could not be created.')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Landing Page</h1>
      <Card>
        <CardContent className="py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Template</label>
            {templatesQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="flex h-9 w-full rounded border border-input-border bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slugTouched) setSlug(slugify(e.target.value))
              }}
              placeholder="Spring Detailing Promo"
              voice
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="spring-detailing-promo"
            />
            <p className="text-xs text-muted-foreground">Will be hosted at /p/{slug || '...'}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} loading={mutation.isPending} className="self-start">
            Create & Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
