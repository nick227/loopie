import { useCreateGoalIdea, useScheduleGoalIdea } from '@project/sdk'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { scheduleTargetPayload } from '../calendar.dates'
import type { ScheduleTarget } from '../calendar.types'

// Retain the successful create step until scheduling succeeds. A retry with the same title
// schedules that template again; a changed title starts a new capture and leaves the idea intact.
export function useQuickAddTask(target: ScheduleTarget, successMessage?: string) {
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)
  const created = useRef<{ title: string; templateId: string } | null>(null)
  const createIdea = useCreateGoalIdea()
  const scheduleIdea = useScheduleGoalIdea()

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed || inFlight.current) return
    inFlight.current = true
    setPending(true)
    try {
      if (created.current?.title !== trimmed) {
        const result = await createIdea.mutateAsync(trimmed)
        if (!result.data) throw new Error('Could not create this task.')
        created.current = { title: trimmed, templateId: result.data.templateId }
      }
      await scheduleIdea.mutateAsync({
        templateId: created.current.templateId,
        ...scheduleTargetPayload(target),
      })
      created.current = null
      setTitle('')
      if (successMessage) toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this task.')
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  return { title, setTitle, pending, submit }
}
