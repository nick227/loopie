import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useUpdateBusiness, ApiError } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { BusinessLogoField } from '@/components/business/BusinessLogoField'

type SocialProfileLink = { platform: string; url: string }

export type BusinessIdentityValue = {
  name: string
  location: string | null
  industry: string | null
  targetAudience: string | null
  socialProfiles: SocialProfileLink[]
  logoUrl: string | null
}

// One shared form, two framings (docs/strategy/03-product-principles.md's First-Login Experience
// step 0 and the Business Profile singleton): first-run setup and a later edit are the same
// action against the same object, not two different flows that happen to look similar.
export function BusinessIdentityForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: BusinessIdentityValue
  submitLabel: string
  onSaved?: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [location, setLocation] = useState(initial.location ?? '')
  const [industry, setIndustry] = useState(initial.industry ?? '')
  const [targetAudience, setTargetAudience] = useState(initial.targetAudience ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [socialProfiles, setSocialProfiles] = useState<SocialProfileLink[]>(initial.socialProfiles)
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateBusiness()

  function updateSocialProfile(index: number, patch: Partial<SocialProfileLink>) {
    setSocialProfiles((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Business name is required.')
      return
    }
    const cleanedProfiles = socialProfiles
      .map((row) => ({ platform: row.platform.trim(), url: row.url.trim() }))
      .filter((row) => row.platform && row.url)
    try {
      await update.mutateAsync({
        name: name.trim(),
        location: location.trim() || null,
        industry: industry.trim() || null,
        targetAudience: targetAudience.trim() || null,
        logoUrl,
        socialProfiles: cleanedProfiles,
      })
      onSaved?.()
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save — please try again.',
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <BusinessLogoField name={name || 'Business'} logoUrl={logoUrl} onChange={setLogoUrl} />

      <div className="space-y-1.5">
        <label htmlFor="business-name" className="text-sm font-medium text-foreground">
          Business name
        </label>
        <Input id="business-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="business-location" className="text-sm font-medium text-foreground">
            Location / service area
          </label>
          <Input
            id="business-location"
            placeholder="Austin, TX"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="business-industry" className="text-sm font-medium text-foreground">
            Industry
          </label>
          <Input
            id="business-industry"
            placeholder="Plumbing"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="business-audience" className="text-sm font-medium text-foreground">
          Target audience
        </label>
        <Textarea
          id="business-audience"
          placeholder="Homeowners in the Austin area looking for emergency repairs"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Social profiles</p>
        <div className="space-y-2">
          {socialProfiles.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label="Platform"
                placeholder="Instagram"
                value={row.platform}
                onChange={(e) => updateSocialProfile(index, { platform: e.target.value })}
                className="w-32 shrink-0"
              />
              <Input
                aria-label="Profile URL"
                placeholder="https://instagram.com/yourbusiness"
                value={row.url}
                onChange={(e) => updateSocialProfile(index, { url: e.target.value })}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => setSocialProfiles((rows) => rows.filter((_, i) => i !== index))}
                className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Remove social profile"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSocialProfiles((rows) => [...rows, { platform: '', url: '' }])}
        >
          <Plus size={14} className="mr-1.5" />
          Add a profile
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
        {update.isPending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
