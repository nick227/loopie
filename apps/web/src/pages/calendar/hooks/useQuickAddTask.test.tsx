import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuickAddTask } from './useQuickAddTask'

const { create, schedule } = vi.hoisted(() => ({ create: vi.fn(), schedule: vi.fn() }))
vi.mock('@project/sdk', () => ({
  useCreateGoalIdea: () => ({ mutateAsync: create }),
  useScheduleGoalIdea: () => ({ mutateAsync: schedule }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('quick-add workflow', () => {
  it('retries scheduling without creating another idea', async () => {
    create.mockResolvedValue({ data: { templateId: 'created-once' } })
    schedule.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({})
    const { result } = renderHook(() => useQuickAddTask({ when: 'TODAY' }))
    act(() => result.current.setTitle('  Test task  '))
    await act(() => result.current.submit())
    expect(result.current.title).toBe('  Test task  ')
    await act(() => result.current.submit())
    expect(create).toHaveBeenCalledTimes(1)
    expect(schedule).toHaveBeenCalledTimes(2)
    expect(schedule).toHaveBeenLastCalledWith({ templateId: 'created-once', when: 'TODAY' })
    expect(result.current.title).toBe('')
  })

  it('guards concurrent submissions before React rerenders', async () => {
    create.mockResolvedValue({ data: { templateId: 'one' } })
    schedule.mockResolvedValue({})
    const { result } = renderHook(() => useQuickAddTask({ when: 'TODAY' }))
    act(() => result.current.setTitle('Task'))
    await act(async () => {
      await Promise.all([result.current.submit(), result.current.submit()])
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(schedule).toHaveBeenCalledTimes(1)
  })

  it('creates a new idea when the title changes after a partial failure', async () => {
    create
      .mockResolvedValueOnce({ data: { templateId: 'old' } })
      .mockResolvedValueOnce({ data: { templateId: 'new' } })
    schedule.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({})
    const { result } = renderHook(() => useQuickAddTask({ when: 'TODAY' }))
    act(() => result.current.setTitle('Old task'))
    await act(() => result.current.submit())
    act(() => result.current.setTitle('New task'))
    await act(() => result.current.submit())
    expect(create).toHaveBeenCalledTimes(2)
    expect(schedule).toHaveBeenLastCalledWith({ templateId: 'new', when: 'TODAY' })
  })
})
