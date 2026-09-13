import { useTeamActivity } from '@project/sdk'
import { sameDay, formatElapsedMinutes } from '../calendar.dates'
import { TeamActivityMember } from '../calendar.types'
import { useElapsedMinutes } from './useElapsedMinutes'

// One standard task line, same shape everywhere in Calendar — no "You" special-casing, no
// separate my-tasks/team-tasks grouping, just whoever on the team is actually tracking something
// right now. A member with nothing running today simply isn't in the list.
function TeamActivityRow({ member }: { member: TeamActivityMember }) {
  const elapsedMinutes = useElapsedMinutes(member.currentEntry?.startedAt ?? null)
  const name = member.email.split('@')[0] ?? member.email

  return (
    <p className="truncate text-xs">
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-muted-foreground">
        {' '}
        — {member.currentEntry?.description} · {formatElapsedMinutes(elapsedMinutes)}
      </span>
    </p>
  )
}

// Team Activity (Phase 3, 2026-09-09; simplified 2026-09-12) — Calendar as a shared team resource:
// what's actively being worked on today, sourced from real TimeEntry rows. Deliberately flat — one
// list, one line format, no me-vs-team split and no "Not tracking" placeholders, since a member
// with nothing running has nothing worth a line. Only worth showing once there's a team to show
// (solo business never sees this) and only while someone is actually tracking something today.
export function TeamActivitySection() {
  const { data } = useTeamActivity()
  const allMembers = data?.data ?? []
  if (allMembers.length < 2) return null

  const now = new Date()
  const active = allMembers.filter(
    (member) => member.currentEntry && sameDay(new Date(member.currentEntry.startedAt), now),
  )
  if (active.length === 0) return null

  return (
    <div className="space-y-1 rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        Team activity
      </p>
      {active.map((member) => (
        <TeamActivityRow key={member.userId} member={member} />
      ))}
    </div>
  )
}
