import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  useBusinessTeam,
  useInviteTeamMember,
  useRemoveTeamMember,
  useUpdateTeamMember,
} from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRestoreOverviewScroll } from '@/hooks/useOverviewScroll'

function accessLabel(role: string, isFounder: boolean) {
  if (isFounder) return 'Founder'
  if (role === 'OWNER') return 'Owner'
  return 'Member'
}

export function TeamPage() {
  useRestoreOverviewScroll()
  const team = useBusinessTeam()
  const invite = useInviteTeamMember()
  const update = useUpdateTeamMember()
  const remove = useRemoveTeamMember()
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [role, setRole] = useState<'OWNER' | 'MEMBER'>('MEMBER')
  const [error, setError] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  const data = team.data?.data
  const canManage = data?.canManage ?? false

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInviteToken(null)
    try {
      const result = await invite.mutateAsync({
        email,
        role,
        jobTitle: jobTitle.trim() || undefined,
      })
      setEmail('')
      setJobTitle('')
      setRole('MEMBER')
      const acceptUrl = result.data?.acceptUrl
      if (acceptUrl) {
        const parts = acceptUrl.split('/').filter(Boolean)
        setInviteToken(parts[1] ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    }
  }

  if (team.isLoading) return <Skeleton className="h-72 w-full" />

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Profile
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add people by their Loopie login email. Job role is a label; access is Owner or Member.
          The founder cannot be suspended or removed.
        </p>
      </div>

      {canManage ? (
        <form onSubmit={onInvite} className="space-y-4 border-b border-border pb-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Invite member
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="email"
              required
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
            <Input
              placeholder="Job role (optional)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              aria-label="Job role"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground">
              Access{' '}
              <select
                className="ml-2 rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
                value={role}
                onChange={(e) => setRole(e.target.value as 'OWNER' | 'MEMBER')}
              >
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
              </select>
            </label>
            <Button type="submit" loading={invite.isPending}>
              Send invite
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {inviteToken ? (
            <p className="text-sm text-muted-foreground">
              Invitation created. Share this link:{' '}
              <Link className="underline" to={`/invitations/${inviteToken}`}>
                /invitations/{inviteToken}
              </Link>
            </p>
          ) : null}
        </form>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Members
        </h2>
        <ul className="divide-y divide-border border-y border-border">
          {(data?.members ?? []).map((member) => (
            <li
              key={member.userId}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                to={`/team/members/${member.userId}`}
                className="flex min-w-0 items-center gap-3"
              >
                <Avatar name={member.email} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {accessLabel(member.role, member.isFounder)}
                    {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                    {member.suspendedAt ? ' · Suspended' : ''}
                  </p>
                </div>
              </Link>
              {canManage && !member.isFounder ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate({
                        userId: member.userId,
                        body: {
                          role: member.role === 'OWNER' ? 'MEMBER' : 'OWNER',
                        },
                      })
                    }
                  >
                    Make {member.role === 'OWNER' ? 'Member' : 'Owner'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate({
                        userId: member.userId,
                        body: { suspended: !member.suspendedAt },
                      })
                    }
                  >
                    {member.suspendedAt ? 'Unsuspend' : 'Suspend'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(member.userId)}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {(data?.invitations?.length ?? 0) > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Pending invitations
          </h2>
          <ul className="space-y-2">
            {data?.invitations.map((inv) => (
              <li key={inv.id} className="text-sm text-muted-foreground">
                {inv.email} · {inv.role}
                {inv.jobTitle ? ` · ${inv.jobTitle}` : ''} · expires{' '}
                {new Date(inv.expiresAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
