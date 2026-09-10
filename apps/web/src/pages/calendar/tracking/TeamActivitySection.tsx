import { useCurrentUser, useTeamActivity } from '@project/sdk'
import { formatElapsedMinutes } from '../calendar.dates'
import { TeamActivityMember } from '../calendar.types'
import { useElapsedMinutes } from './useElapsedMinutes'

// One team member's line — "Name — activity · elapsed" or "Name — Not tracking." Compact tracking
// state only, per the product rule: there is no presence/online concept, so a member with no
// currentEntry never reads as "away" or "offline," just not tracking right now.
function TeamActivityRow({ member, isMe }: { member: TeamActivityMember; isMe: boolean }) {
  const elapsedMinutes = useElapsedMinutes(member.currentEntry?.startedAt ?? null)
  const name = isMe ? 'You' : (member.email.split('@')[0] ?? member.email)

  return (
    <p className="truncate text-xs">
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-muted-foreground">
        {member.currentEntry ? (
          <>
            {' '}
            — {member.currentEntry.description} · {formatElapsedMinutes(elapsedMinutes)}
          </>
        ) : (
          ' — Not tracking'
        )}
      </span>
    </p>
  )
}

// Team Activity (Phase 3, 2026-09-09) — Calendar as a shared team resource: what everyone's
// doing right now, sourced entirely from real TimeEntry rows. No presence/online tracking exists
// anywhere in this product — see useTeamActivity's own comment — so this only ever shows what a
// member is actively tracking, never whether they're "online." Only worth showing once there's a
// team to show; a solo business never sees this.
export function TeamActivitySection() {
  const { data } = useTeamActivity()
  const { data: me } = useCurrentUser()
  const members = data?.data ?? []

  if (members.length < 2) return null

  return (
    <div className="space-y-1 rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        Team activity
      </p>
      {members.map((member) => (
        <TeamActivityRow key={member.userId} member={member} isMe={member.userId === me?.data.id} />
      ))}
    </div>
  )
}
