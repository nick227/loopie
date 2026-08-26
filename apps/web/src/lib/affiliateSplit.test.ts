import { describe, it, expect } from 'vitest'
import { computePreviewSplit } from './affiliateSplit'

describe('affiliateSplit', () => {
  describe('computePreviewSplit', () => {
    it('computes correct split with no manager', () => {
      const split = computePreviewSplit({
        saleDollars: 100, // $100 sale
        rateBps: 1000, // 10% commission rate
        managerShareBps: null,
        hasManager: false,
      })

      // Math:
      // saleAmountMinor: 100 * 100 = 10000
      // grossCommissionMinor: 10000 * 10% = 1000
      // managerCommissionMinor: 0
      // affiliateCommissionMinor: 1000
      expect(split.saleAmountMinor).toBe(10000)
      expect(split.grossCommissionMinor).toBe(1000)
      expect(split.managerCommissionMinor).toBe(0)
      expect(split.affiliateCommissionMinor).toBe(1000)
    })

    it('computes correct split with a manager taking a cut', () => {
      const split = computePreviewSplit({
        saleDollars: 100, // $100 sale
        rateBps: 1000, // 10% gross commission rate
        managerShareBps: 2000, // Manager takes 20% of the gross commission
        hasManager: true,
      })

      // Math:
      // saleAmountMinor: 10000
      // grossCommissionMinor: 1000
      // managerCommissionMinor: 1000 * 20% = 200
      // affiliateCommissionMinor: 1000 - 200 = 800
      expect(split.saleAmountMinor).toBe(10000)
      expect(split.grossCommissionMinor).toBe(1000)
      expect(split.managerCommissionMinor).toBe(200)
      expect(split.affiliateCommissionMinor).toBe(800)
    })

    it('handles undefined inputs safely', () => {
      const split = computePreviewSplit({
        rateBps: undefined,
        managerShareBps: undefined,
        hasManager: true,
      })

      expect(split.grossCommissionMinor).toBe(0)
      expect(split.managerCommissionMinor).toBe(0)
      expect(split.affiliateCommissionMinor).toBe(0)
    })
  })
})
