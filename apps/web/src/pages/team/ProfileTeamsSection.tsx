import { Link } from 'react-router-dom'
import { ArrowUpRight, Users } from 'lucide-react'
import { useBusinessTeam, useMyBusinesses, useSetActiveBusiness } from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

function accessLabel(role: string, isFounder: boolean) {
  if (isFounder) return 'Founder'
  if (role === 'OWNER') return 'Owner'
  return 'Member'
}

export function ProfileTeamsSection() {
  const businesses = useMyBusinesses()
  const team = useBusinessTeam()
  const switchBusiness = useSetActiveBusiness()
  const companies = businesses.data?.data ?? []
  const roster = team.data?.data
  const active = companies.find((c) => c.active)

  if (businesses.isLoading || team.isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  return (
    <section
      aria-labelledby="teams-heading"
      className="overflow-hidden rounded-2xl border border-border bg-surface/40"
    >
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Companies
          </p>
          <h2
            id="teams-heading"
            className="mt-2 text-xl font-semibold tracking-tight text-foreground"
          >
            Your team
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite people by email, set their job role and access, switch companies here.
          </p>
        </div>
        <Link
          to="/team"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Manage team <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid gap-0 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Your companies
          </p>
          <ul className="mt-4 space-y-3">
            {companies.map((company) => (
              <li key={company.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {accessLabel(company.role, company.isFounder)}
                    {company.jobTitle ? ` · ${company.jobTitle}` : ''}
                  </p>
                </div>
                {company.active ? (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">Active</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={switchBusiness.isPending}
                    onClick={() => switchBusiness.mutate(company.id)}
                  >
                    Switch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Team{active ? ` — ${active.name}` : ''}
            </p>
            <Users size={16} className="text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-3">
            {(roster?.members ?? []).slice(0, 6).map((member) => (
              <li key={member.userId}>
                <Link
                  to={`/team/members/${member.userId}`}
                  className="flex items-center gap-3 rounded-lg transition-colors hover:bg-background/60"
                >
                  <Avatar name={member.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {accessLabel(member.role, member.isFounder)}
                      {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                      {member.suspendedAt ? ' · Suspended' : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {roster?.canManage ? (
            <Link
              to="/team"
              className="mt-5 inline-flex text-sm font-medium text-foreground underline decoration-border underline-offset-4"
            >
              Invite member
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
