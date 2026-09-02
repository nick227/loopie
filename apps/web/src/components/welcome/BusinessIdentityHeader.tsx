import { Building2, Briefcase, MapPin, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBusiness } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { mediaSrc } from '@/lib/media'
import { BusinessIdentityForm } from '@/components/business/BusinessIdentityForm'

export function BusinessIdentityHeader() {
  const business = useBusiness()

  if (business.isLoading) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }

  const data = business.data?.data
  if (!data) return null

  const src = mediaSrc(data.logoUrl)

  const initials = data.name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <section className="overflow-hidden rounded-2xl border border-border">
      <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
        {/* Identity / avatar */}
        <div className="flex items-center gap-4 border-b border-border p-5 lg:flex-col lg:items-start lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-xl font-semibold text-foreground shadow-sm sm:h-24 sm:w-24 lg:h-32 lg:w-32">
            {src ? (
              <img src={src} alt={`${data.name} logo`} className="h-full w-full object-cover" />
            ) : initials ? (
              initials
            ) : (
              <Building2 size={32} strokeWidth={1.5} className="text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 lg:w-full">
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {data.name}
            </h2>

            <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
              {data.industry && (
                <div className="flex items-center gap-1.5">
                  <Briefcase size={13} strokeWidth={1.8} />
                  <span className="truncate">{data.industry}</span>
                </div>
              )}

              {data.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} strokeWidth={1.8} />
                  <span className="truncate">{data.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="min-w-0 p-5 sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="flex justify-between"></div>
            {data.slug && (
              // In-app now — the profile page is a real SPA route (see the "Business profiles:
              // redesign + fold into the app shell" plan doc) that resolves the same session
              // cookie the SDK always sends, so the owner is recognized there exactly the way
              // this external link used to require popping out to VITE_API_URL's own origin for.
              <Link
                to={`/b/${data.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View public profile <ArrowUpRight size={14} />
              </Link>
            )}

            <BusinessIdentityForm
              initial={{
                name: data.name,
                location: data.location ?? null,
                industry: data.industry ?? null,
                targetAudience: data.targetAudience ?? null,
                socialProfiles: data.socialProfiles ?? [],
                logoUrl: data.logoUrl ?? null,
                description: data.description ?? null,
                phone: data.phone ?? null,
                email: data.email ?? null,
                hours: data.hours ?? null,
                galleryImageUrls: data.galleryImageUrls ?? [],
              }}
              submitLabel="Save changes"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
