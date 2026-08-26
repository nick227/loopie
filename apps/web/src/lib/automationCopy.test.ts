import { describe, it, expect } from 'vitest'
import { actionLabel, outcomeLabel, automationStatusLabel, triggerLabel } from './automationCopy'

describe('automationCopy', () => {
  it('uses readable trigger, action, and run outcomes', () => {
    expect(triggerLabel('LEAD_CREATED')).toBe('Lead created')
    expect(actionLabel('SEND_EMAIL')).toBe('Send email')
    expect(outcomeLabel('SENT')).toBe('Executed')
    expect(outcomeLabel('SKIPPED')).toBe('Skipped')
    expect(outcomeLabel('FAILED')).toBe('Failed')
    expect(automationStatusLabel(false)).toBe('Paused')
  })
})
