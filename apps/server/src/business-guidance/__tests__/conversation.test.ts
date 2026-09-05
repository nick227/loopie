// Conversation — the browsable advice/knowledge corpus (2026-09-04, "Conversation = ongoing
// business advice / knowledge exploration," wholly independent of Actions). Exercised directly
// through AssistantConversationService rather than the full goal-cycle machinery: `resolve` only
// needs a BusinessKnowledge shape and a businessId, so there's no need to walk Learn questions to
// prove venture filtering, dynamic-insight inclusion, deterministic rotation, or the signal boost.
import { describe, it, expect } from 'vitest'
import { buildTestApp, testBusinessId } from '../../__tests__/helpers'
import { db } from '@project/db'
import { AssistantConversationService } from '../../services/AssistantConversationService'
import type { BusinessKnowledge } from '../knowledge/businessKnowledge'

buildTestApp() // seeds testBusinessId before each test; no HTTP calls needed here

const service = new AssistantConversationService()

const ROOFING: BusinessKnowledge = { ventureType: 'ROOFING', traits: ['LOCAL', 'EQUIPMENT_HEAVY'] }
const DESIGN_STUDIO: BusinessKnowledge = {
  ventureType: 'DESIGN_STUDIO',
  traits: ['ONLINE', 'PROJECT_BASED'],
}

describe('AssistantConversationService', () => {
  it('filters by venture: an equipment-heavy trade gets Equipment content, Design Studio does not', async () => {
    const roofing = await service.resolve(testBusinessId, ROOFING)
    expect(roofing.categories.map((c) => c.category)).toContain('EQUIPMENT')
    expect(roofing.insights.some((i) => i.id === 'local-minimum-price-per-stop')).toBe(true)

    const designStudio = await service.resolve(testBusinessId, DESIGN_STUDIO)
    expect(designStudio.categories.map((c) => c.category)).not.toContain('EQUIPMENT')
    expect(designStudio.insights.some((i) => i.id === 'design-studio-tiered-pricing')).toBe(true)
    expect(designStudio.insights.some((i) => i.category === 'EQUIPMENT')).toBe(false)
  })

  it('a business with no venture known yet still gets real generic content', async () => {
    const result = await service.resolve(testBusinessId, {})
    expect(result.insights.length).toBeGreaterThan(0)
    expect(result.insights.some((i) => i.id === 'generic-one-line-offer')).toBe(true)
  })

  it('related-topic ids on a featured insight resolve to real insights in the same payload', async () => {
    const result = await service.resolve(testBusinessId, ROOFING)
    const minimumPrice = result.insights.find((i) => i.id === 'local-minimum-price-per-stop')!
    expect(minimumPrice.relatedInsightIds).toContain('local-route-pricing')
    expect(result.insights.some((i) => i.id === 'local-route-pricing')).toBe(true)
  })

  it('a business with 3+ real sales gets the dynamic average-sale-value insight', async () => {
    const before = await service.resolve(testBusinessId, ROOFING)
    expect(before.insights.some((i) => i.id === 'dynamic-average-sale-value')).toBe(false)

    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Repeat Customer' },
    })
    for (let i = 0; i < 3; i++) {
      await db.sale.create({
        data: {
          businessId: testBusinessId,
          contactId: contact.id,
          amount: 500 + i * 100,
          date: new Date(),
          sourceType: 'MANUAL',
          idempotencyKey: `conversation-test-sale-${i}`,
        },
      })
    }

    const after = await service.resolve(testBusinessId, ROOFING)
    const dynamic = after.insights.find((i) => i.id === 'dynamic-average-sale-value')
    expect(dynamic).toBeDefined()
    expect(dynamic!.isDynamic).toBe(true)
    expect(dynamic!.category).toBe('RETENTION')
    expect(dynamic!.headline).toMatch(/\$\d/)
  })

  it('a business with leads flagged for follow-up gets the dynamic follow-up insight', async () => {
    const before = await service.resolve(testBusinessId, ROOFING)
    expect(before.insights.some((i) => i.id === 'dynamic-leads-need-follow-up')).toBe(false)

    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Needs Follow Up' },
    })
    await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        stage: 'INTERESTED',
        sourceType: 'MANUAL',
        openSlot: 'OPEN',
        followUp: true,
      },
    })

    const after = await service.resolve(testBusinessId, ROOFING)
    const dynamic = after.insights.find((i) => i.id === 'dynamic-leads-need-follow-up')
    expect(dynamic).toBeDefined()
    expect(dynamic!.category).toBe('SALES')
  })

  it('the featured insight is deterministic for the same business on the same day', async () => {
    const first = await service.resolve(testBusinessId, ROOFING)
    const second = await service.resolve(testBusinessId, ROOFING)
    expect(second.featuredId).toBe(first.featuredId)
  })

  it('an active signal boosts the matching category to featured', async () => {
    const result = await service.resolve(testBusinessId, ROOFING, 'RETENTION')
    const featured = result.insights.find((i) => i.id === result.featuredId)
    expect(featured?.category).toBe('RETENTION')
  })
})
