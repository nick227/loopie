import { Link } from 'react-router-dom'
import { ArrowUpRight, Briefcase, MapPin } from 'lucide-react'
import { useBusiness } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { mediaSrc } from '@/lib/media'

export function BusinessHeader() {
  const business = useBusiness()

  if (business.isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />
  }

  const data = business.data?.data
  if (!data) return null

  return (
    <section className="business-header flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={mediaSrc(data.logoUrl)}
            name={data.name || 'Business'}
            size="lg"
            className="h-16 w-16 border border-border bg-background text-lg"
          />
          <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
            {data.name || 'Business'}
          </h1>
        </div>

        {data.slug ? (
          <Link
            to={`/b/${data.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View public profile <ArrowUpRight size={14} />
          </Link>
        ) : null}
      </div>

      {data.industry || data.location ? (
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {data.industry ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Briefcase size={13} strokeWidth={1.8} />
              <span className="truncate">{data.industry}</span>
            </div>
          ) : null}
          {data.location ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.8} />
              <span className="truncate">{data.location}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
