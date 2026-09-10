import { describe, expect, it } from 'vitest'
import {
  calendarRange,
  localInputToIso,
  monthInterval,
  parseLocalDate,
  scheduleInputs,
  toDateInput,
  toDateTimeInput,
} from './calendar.dates'

describe('calendar date boundary', () => {
  it('round-trips date-only and timed inputs in the viewer timezone', () => {
    const day = localInputToIso('2026-09-10')
    expect(scheduleInputs(day, false)).toEqual({ date: '2026-09-10', time: '' })
    expect(new Date(day).getHours()).toBe(0)
    const timed = localInputToIso('2026-09-10', '09:45')
    expect(scheduleInputs(timed, true)).toEqual({ date: '2026-09-10', time: '09:45' })
    expect(toDateTimeInput(new Date(timed))).toBe('2026-09-10T09:45')
  })

  it('rejects invalid dates instead of rolling them into another month', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull()
    expect(parseLocalDate('garbage')).toBeNull()
    expect(() => localInputToIso('2026-02-30')).toThrow('Choose a valid date')
    expect(() => localInputToIso('2026-09-10', '25:00')).toThrow('Choose a valid local time')
  })

  it.each([new Date(2026, 2, 1), new Date(2026, 10, 1), new Date(2028, 1, 1)])(
    'uses the same complete weeks for fetching and rendering %s',
    (anchor) => {
      const interval = monthInterval(anchor)
      expect(calendarRange(anchor, 'month')).toEqual(interval)
      expect(interval.from.getDay()).toBe(1)
      expect(interval.to.getDay()).toBe(1)
      expect(interval.days.length % 7).toBe(0)
      expect(new Set(interval.days.map(toDateInput)).size).toBe(interval.days.length)
      expect(interval.days.every((day) => day.getHours() === 0)).toBe(true)
      expect(interval.days.at(-1)!.getTime()).toBeLessThan(interval.to.getTime())
    },
  )

  it('handles spring and fall offset changes without shifting calendar days', () => {
    for (const day of ['2026-03-08', '2026-03-09', '2026-11-01', '2026-11-02']) {
      expect(toDateInput(new Date(localInputToIso(day)))).toBe(day)
    }
    // Run this suite under America/Chicago as well as UTC.
    if (new Date(2026, 2, 8).getTimezoneOffset() !== new Date(2026, 2, 9).getTimezoneOffset()) {
      expect(() => localInputToIso('2026-03-08', '02:30')).toThrow('Choose a valid local time')
    }
  })
})
