import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Clock3,
  DollarSign,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react'
import { useBusinessProfile, useCurrentUser } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { mediaSrc } from '@/lib/media'
import { usePageTitle } from '@/lib/headerContext'
import { BusinessMessageDrawer } from './BusinessMessageDrawer'

// Eyebrow labels above a section heading — a light touch of the app's own mono/uppercase meta
// convention (see PageHeader's `meta` slot), not this page's old brutalist 10px/0.22em treatment.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <Icon size={15} strokeWidth={1.8} />
        {label}
      </dt>
      <dd className="min-w-0 text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ContactRow({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: typeof Mail
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Icon size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-all">{children}</span>
    </a>
  )
}

export function BusinessProfilePage() {
  const [messageOpen, setMessageOpen] = useState(false)
  const { slug } = useParams<{ slug: string }>()
  const me = useCurrentUser()
  const profileQuery = useBusinessProfile(slug)
  const profile = profileQuery.data?.data
  usePageTitle(profile?.business.name ?? null)

  if (profileQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-4 sm:px-6">
        <Skeleton className="aspect-[16/10] w-full rounded-2xl sm:aspect-[21/9]" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={BriefcaseBusiness}
          title="Business not found"
          description="This business page doesn't exist or was removed."
        />
      </div>
    )
  }

  const { business, isOwnProfile } = profile
  const artwork = business.galleryImageUrls ?? []
  const heroArtwork = mediaSrc(artwork[0])
  const logo = mediaSrc(business.logoUrl)
  const portfolio = artwork.slice(heroArtwork ? 1 : 0)
  const socialProfiles = business.socialProfiles.filter((profile) =>
    /^https?:\/\//i.test(profile.url),
  )
  const hasFacts = Boolean(
    business.location ||
    business.hours ||
    business.industry ||
    business.address ||
    business.foundedYear ||
    business.teamSize ||
    business.businessType ||
    business.priceRange ||
    business.timezone,
  )

  return (
    // No bespoke wordmark/header here — the page renders inside Shell now (see App.tsx), which
    // already supplies the persistent Home/Pages/Advertising/CRM nav plus a "‹ River" back
    // affordance (Shell.tsx's ENTITY_ROUTES) for this route. A business profile is the business's
    // identity *inside* Loopie, not a separate published site with its own chrome.
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6">
      {/* Photo — a single, contained hero (Yelp's plain lead photo, not Airbnb's multi-photo grid,
          which this data model has no captions/lightbox infrastructure to support honestly). */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[21/9]"
        aria-hidden={!heroArtwork && !logo}
      >
        {heroArtwork ? (
          <img
            src={heroArtwork}
            alt={`Featured work by ${business.name}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : logo ? (
          <img
            src={logo}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BriefcaseBusiness size={36} strokeWidth={1.5} className="text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Identity — Yelp's name + category + neighborhood, directly under the photo. */}
      <div className="mt-6 flex items-start gap-4">
        {logo ? (
          <img
            src={logo}
            alt={`${business.name} logo`}
            className="h-14 w-14 shrink-0 rounded-xl border border-border bg-background object-cover sm:h-16 sm:w-16"
          />
        ) : null}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {business.industry ?? 'Independent business'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {business.name}
          </h1>
          {business.tagline ? (
            <p className="mt-1 text-sm text-muted-foreground">{business.tagline}</p>
          ) : null}
          {business.location ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} strokeWidth={1.8} />
              {business.location}
            </p>
          ) : null}
        </div>
      </div>

      {/* Main + sidebar — Airbnb's listing/booking split. Sidebar renders first in source order
          (Yelp puts contact actions right under the name on mobile, not after a scroll) and moves
          to a sticky right rail once there's room for two columns. */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-10">
        <div className="order-2 space-y-10 lg:order-1">
          {business.description || business.targetAudience ? (
            <section aria-labelledby="about-title">
              <Eyebrow>About</Eyebrow>
              <h2 id="about-title" className="sr-only">
                About {business.name}
              </h2>
              {business.description ? (
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-foreground/90">
                  {business.description}
                </p>
              ) : null}
              {business.targetAudience ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Built for</span>{' '}
                  {business.targetAudience}
                </p>
              ) : null}
            </section>
          ) : null}

          {portfolio.length ? (
            <section aria-labelledby="portfolio-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <Eyebrow>Selected work</Eyebrow>
                  <h2 id="portfolio-title" className="mt-1 text-xl font-bold tracking-tight">
                    The work
                  </h2>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(portfolio.length).padStart(2, '0')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {portfolio.map((url, index) => (
                  <figure key={`${url}-${index}`} className="overflow-hidden rounded-xl bg-muted">
                    <img
                      src={mediaSrc(url) ?? undefined}
                      alt={`Work by ${business.name}, image ${index + 2}`}
                      loading="lazy"
                      className="aspect-square h-full w-full object-cover"
                    />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-6">
          <Card className="border border-border bg-surface shadow-sm">
            <CardContent className="space-y-5 p-5">
              {!isOwnProfile ? (
                <>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Get in touch</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sent straight to their Loopie inbox.
                    </p>
                  </div>
                  <Button className="w-full" onClick={() => setMessageOpen(true)}>
                    <MessageCircle size={16} />
                    Message {business.name}
                  </Button>
                  {business.phone || business.email || business.website ? (
                    <div className="space-y-2">
                      {business.phone ? (
                        <ContactRow href={`tel:${business.phone}`} icon={Phone}>
                          {business.phone}
                        </ContactRow>
                      ) : null}
                      {business.email ? (
                        <ContactRow href={`mailto:${business.email}`} icon={Mail}>
                          {business.email}
                        </ContactRow>
                      ) : null}
                      {business.website ? (
                        <ContactRow href={business.website} icon={Globe}>
                          {business.website}
                        </ContactRow>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center">
                  <p className="text-sm font-medium text-foreground">This is your public page</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Customers see this when they look you up.
                  </p>
                  <Link
                    to="/home"
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Edit business details
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}

              {hasFacts ? (
                <dl className="divide-y divide-border border-t border-border pt-1">
                  {business.location ? (
                    <FactRow icon={MapPin} label="Where" value={business.location} />
                  ) : null}
                  {business.hours ? (
                    <FactRow
                      icon={Clock3}
                      label="Hours"
                      value={<span className="whitespace-pre-wrap">{business.hours}</span>}
                    />
                  ) : null}
                  {business.industry ? (
                    <FactRow icon={BriefcaseBusiness} label="Work" value={business.industry} />
                  ) : null}
                  {business.address ? (
                    <FactRow icon={MapPin} label="Address" value={business.address} />
                  ) : null}
                  {business.businessType ? (
                    <FactRow icon={Building2} label="Type" value={business.businessType} />
                  ) : null}
                  {business.foundedYear ? (
                    <FactRow icon={Calendar} label="Founded" value={business.foundedYear} />
                  ) : null}
                  {business.teamSize ? (
                    <FactRow icon={Users} label="Team size" value={business.teamSize} />
                  ) : null}
                  {business.priceRange ? (
                    <FactRow icon={DollarSign} label="Price" value={business.priceRange} />
                  ) : null}
                  {business.timezone ? (
                    <FactRow icon={Clock3} label="Timezone" value={business.timezone} />
                  ) : null}
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {socialProfiles.length ? (
        <footer className="mt-14 flex flex-col gap-4 border-t border-border pt-8">
          <Eyebrow>Social</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {socialProfiles.map((profile) => (
              <a
                key={`${profile.platform}-${profile.url}`}
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted"
              >
                {profile.platform}
                <ArrowUpRight
                  size={13}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            ))}
          </div>
        </footer>
      ) : null}

      <BusinessMessageDrawer
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        businessName={business.name}
        slug={slug!}
        senderName={me.data?.data?.businessName}
        senderPending={me.isPending}
      />
    </div>
  )
}
