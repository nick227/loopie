import { describe, expect, it } from 'vitest'
import { metaConnector } from '../lib/platforms/meta'
import type { EditMode, FieldEditModes } from '../lib/platforms/types'

const FIELDS: (keyof FieldEditModes)[] = [
  'budget',
  'schedule',
  'creative',
  'destination',
  'targeting',
]

describe('edit-mode classification', () => {
  it('declares a mode for every field, never leaving one to silently default', () => {
    for (const field of FIELDS) {
      const mode = metaConnector.capabilities.editModes?.[field]
      expect(mode).toBeDefined()
      expect(['NONE', 'IN_PLACE', 'RECREATE']).toContain(mode)
    }
  })

  it('agrees with the load-bearing editBudget/editSchedule booleans — a field only has a real, wired live editor when both say the same thing', () => {
    const caps = metaConnector.capabilities
    expect(caps.editModes?.budget === 'IN_PLACE').toBe(Boolean(caps.editBudget))
    expect(caps.editModes?.schedule === 'IN_PLACE').toBe(Boolean(caps.editSchedule))
  })

  it('classifies budget and schedule as IN_PLACE — both PATCH the same ad set object, no new id minted', () => {
    expect(metaConnector.capabilities.editModes?.budget).toBe('IN_PLACE')
    expect(metaConnector.capabilities.editModes?.schedule).toBe('IN_PLACE')
  })

  it('classifies creative and destination as RECREATE — Meta creatives are immutable, so both require a new provider execution', () => {
    expect(metaConnector.capabilities.editModes?.creative).toBe('RECREATE')
    expect(metaConnector.capabilities.editModes?.destination).toBe('RECREATE')
  })

  it('classifies targeting as IN_PLACE (the ad set targeting field is directly PATCHable) and, since the "complete paid-run editing" milestone, is genuinely wired', () => {
    expect(metaConnector.capabilities.editModes?.targeting).toBe('IN_PLACE')
    // Same agreement rule as budget/schedule above — a field only has a real, wired live editor
    // when both the boolean and a real connector method exist.
    expect(metaConnector.capabilities.editAudience).toBe(true)
    expect(metaConnector.updateTargeting).toBeDefined()
  })

  it('exercises a synthetic connector with a different classification, proving the type itself imposes no platform-specific meaning — the UI is what gives these values consequence', () => {
    const synthetic: Partial<Record<keyof FieldEditModes, EditMode>> = {
      budget: 'RECREATE',
      schedule: 'NONE',
      creative: 'IN_PLACE',
      destination: 'IN_PLACE',
      targeting: 'NONE',
    }
    for (const field of FIELDS) {
      expect(['NONE', 'IN_PLACE', 'RECREATE']).toContain(synthetic[field])
    }
    // Deliberately the inverse of Meta's real classification on every field, to prove the enum
    // isn't secretly Meta-shaped.
    expect(synthetic.budget).not.toBe(metaConnector.capabilities.editModes?.budget)
    expect(synthetic.creative).not.toBe(metaConnector.capabilities.editModes?.creative)
  })
})
