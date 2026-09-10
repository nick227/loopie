import { useBusinessTeam, useCurrentUser } from '@project/sdk'

export function TaskOwner({ userId }: { userId?: string | null }) {
  const team = useBusinessTeam()
  const member = team.data?.data.members.find((item) => item.userId === userId)
  const label = userId ? (member?.email ?? 'Assigned teammate') : 'Unassigned'
  return (
    <span
      title={label}
      aria-label={`Assignee: ${label}`}
      className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
    >
      {userId ? (member?.email.slice(0, 2).toUpperCase() ?? '…') : 'Unassigned'}
    </span>
  )
}

export function AssigneeFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const team = useBusinessTeam()
  const me = useCurrentUser()
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Assignee
      <select
        aria-label="Filter by assignee"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-56 rounded border border-input-border bg-background px-2 py-1.5 text-sm text-foreground"
      >
        <option value="everyone">Everyone</option>
        <option value="me">Me</option>
        <option value="unassigned">Unassigned</option>
        {team.data?.data.members
          .filter((member) => member.userId !== me.data?.data.id)
          .map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.email}
            </option>
          ))}
      </select>
    </label>
  )
}
