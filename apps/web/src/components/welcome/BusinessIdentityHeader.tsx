import { Briefcase, MapPin, ArrowUpRight } from 'lucide-react'
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
      <div className="">
        {/* Editable fields */}
        <div className="min-w-0 p-5 sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
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
                slug: data.slug ?? null,
                email: data.email ?? null,
                hours: data.hours ?? null,
                galleryImageUrls: data.galleryImageUrls ?? [],
                website: data.website ?? null,
                tagline: data.tagline ?? null,
                address: data.address ?? null,
              }}
              submitLabel="Save changes"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
