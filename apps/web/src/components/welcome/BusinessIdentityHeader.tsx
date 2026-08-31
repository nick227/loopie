import { useState } from 'react'
import { MapPin, Briefcase, Pencil, X, CheckCircle2 } from 'lucide-react'
import { useBusiness } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { mediaSrc } from '@/lib/media'
import { BusinessIdentityForm } from '@/components/business/BusinessIdentityForm'

// The one shared identity header, embedded at the top of Home. Editable in place — the standalone
// Business Profile page (/business, BusinessIdentityForm's other former host) is gone; there's no
// reason a business's own name/location/industry/audience/social links need a whole extra page
// when they can be edited right where they're already shown.
export function BusinessIdentityHeader() {
  const business = useBusiness()
  const [editing, setEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  if (business.isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />
  const data = business.data?.data
  if (!data) return null

  if (editing) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Edit business profile</p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Close editor"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4">
          <BusinessIdentityForm
            initial={{
              name: data.name,
              location: data.location ?? null,
              industry: data.industry ?? null,
              targetAudience: data.targetAudience ?? null,
              socialProfiles: data.socialProfiles ?? [],
              logoUrl: data.logoUrl ?? null,
            }}
            submitLabel="Save changes"
            onSaved={() => {
              setJustSaved(true)
              setEditing(false)
              setTimeout(() => setJustSaved(false), 2500)
            }}
          />
        </div>
      </div>
    )
  }

  const src = mediaSrc(data.logoUrl)
  const initials = data.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold tracking-tight text-foreground">{data.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {data.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {data.location}
              </span>
            ) : null}
            {data.industry ? (
              <span className="inline-flex items-center gap-1">
                <Briefcase size={13} /> {data.industry}
              </span>
            ) : null}
          </div>
          {justSaved ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-success" role="status">
              <CheckCircle2 size={14} /> Saved
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your live presence across pages, ads, posts, and email.
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-input-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:self-center"
      >
        <Pencil size={14} />
        Edit profile
      </button>
    </div>
  )
}
