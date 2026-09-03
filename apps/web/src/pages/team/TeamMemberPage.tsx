import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTeamMemberMetrics, useUpdateTeamMember } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRestoreOverviewScroll } from '@/hooks/useOverviewScroll'

function accessLabel(role: string, isFounder: boolean) {
  if (isFounder) return 'Founder'
  if (role === 'OWNER') return 'Owner'
  return 'Member'
}

export function TeamMemberPage() {
  useRestoreOverviewScroll()
  const { userId = '' } = useParams()
  const metrics = useTeamMemberMetrics(userId)
  const update = useUpdateTeamMember()
  const data = metrics.data?.data

  if (metrics.isLoading) return <Skeleton className="h-72 w-full" />
  if (metrics.isError || !data) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-destructive">Team member could not be loaded.</p>
        <Link to="/team" className="mt-4 inline-block text-sm underline">
          Back to team
        </Link>
      </div>
    )
  }

  const stats = [
    { label: 'CRM notes written', value: data.metrics.notesWritten },
    { label: 'Pages published', value: data.metrics.pagesPublished },
    { label: 'Ad revisions', value: data.metrics.adRevisionsCreated },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          to="/team"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Team
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={data.email} size="lg" className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.email}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {accessLabel(data.role, data.isFounder)}
              {data.jobTitle ? ` · ${data.jobTitle}` : ''}
              {data.suspendedAt ? ' · Suspended' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Member since{' '}
              {new Date(data.memberSince).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Activity in this company
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="border-t border-border pt-3">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {data.isFounder ? (
        <p className="text-sm text-muted-foreground">
          This person founded the company. Their account cannot be suspended or removed by other
          team members.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={update.isPending}
            onClick={() =>
              update.mutate({
                userId: data.userId,
                body: { suspended: !data.suspendedAt },
              })
            }
          >
            {data.suspendedAt ? 'Unsuspend account' : 'Suspend account'}
          </Button>
          <Link
            to="/team"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Edit access on Team
          </Link>
        </div>
      )}
    </div>
  )
}
