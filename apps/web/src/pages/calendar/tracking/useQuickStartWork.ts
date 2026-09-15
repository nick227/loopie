import { ApiError, useCurrentUser, useStartTimeEntry } from '@project/sdk'
import { toast } from 'sonner'

// Shared start-with-conflict-handling logic (2026-09-15 Calendar connective-tissue pass) — used by
// both the "Start Work" rail (TimeTracker.tsx, a free-text description, optionally picking a
// task) and a task popover's own inline Start button (InlineStartStop, already knows which task,
// no picking needed). One codepath for the 409 ACTIVE_TIME_ENTRY_EXISTS message, not a duplicate.
export function useQuickStartWork() {
  const { data: me } = useCurrentUser()
  const start = useStartTimeEntry()

  // 'started': succeeded. 'conflict': someone (possibly this same user, elsewhere) is already
  // tracking something — retrying the same form won't help, so callers should close/reset rather
  // than leave it open. 'error': a real failure — callers should leave the form open to retry.
  async function startWork(
    description: string,
    scheduledGoalId?: string | null,
  ): Promise<'started' | 'conflict' | 'error'> {
    const trimmed = description.trim()
    if (!trimmed) return 'error'
    try {
      await start.mutateAsync({
        description: trimmed,
        scheduledGoalId: scheduledGoalId ?? undefined,
      })
      toast.success('Started')
      return 'started'
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACTIVE_TIME_ENTRY_EXISTS') {
        const active = error.data as
          { businessId: string; businessName: string; description: string } | undefined
        if (active) {
          const sameBusiness = active.businessId === me?.data.businessId
          toast.error(
            sameBusiness
              ? `You're already tracking "${active.description}". Stop it first.`
              : `You're tracking "${active.description}" for ${active.businessName}. Stop it there first.`,
          )
          return 'conflict'
        }
      }
      toast.error(error instanceof Error ? error.message : 'Could not start this.')
      return 'error'
    }
  }

  return { startWork, isPending: start.isPending }
}
