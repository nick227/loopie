import { useNavigate } from 'react-router-dom'
import { Command } from 'lucide-react'
import { useBusiness } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { BusinessIdentityForm } from '@/components/business/BusinessIdentityForm'

// First-login step 0 (docs/strategy/03-product-principles.md) — one calm screen, no Shell chrome
// (no Inbox/Create/More nav visible mid-setup), landing directly in Inbox on save. Reached only
// when InboxRoute (lib/RequireRole.tsx) sees businessIdentityCompletedAt is still null; also
// reachable directly by URL for a user who backs out before saving.
export function BusinessSetupPage() {
  const navigate = useNavigate()
  const business = useBusiness()

  if (business.isLoading) return <PageSpinner />
  const data = business.data?.data

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Command size={24} />
            </div>
            <span className="text-2xl font-semibold tracking-tight">Loopie</span>
          </div>
          <div>
            <h1 className="text-xl font-medium text-foreground">let&rsquo;s get to know you</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-6">
            <BusinessIdentityForm
              initial={{
                name: data?.name ?? '',
                slug: data?.slug ?? '',
                location: data?.location ?? null,
                industry: data?.industry ?? null,
                targetAudience: data?.targetAudience ?? null,
                socialProfiles: data?.socialProfiles ?? [],
                logoUrl: data?.logoUrl ?? null,
                description: data?.description ?? null,
                phone: data?.phone ?? null,
                email: data?.email ?? null,
                hours: data?.hours ?? null,
                galleryImageUrls: data?.galleryImageUrls ?? [],
                website: data?.website ?? null,
                tagline: data?.tagline ?? null,
                address: data?.address ?? null,
                foundedYear: data?.foundedYear ?? null,
                teamSize: data?.teamSize ?? null,
                businessType: data?.businessType ?? null,
                priceRange: data?.priceRange ?? null,
                timezone: data?.timezone ?? null,
              }}
              submitLabel="Continue to Inbox"
              onSaved={() => navigate('/home', { replace: true })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
