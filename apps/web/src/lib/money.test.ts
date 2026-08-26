import { describe, it, expect } from 'vitest'
import { dollarsToMinor, formatUsd, formatBps, formatDollars } from './money'

describe('money', () => {
  describe('dollarsToMinor', () => {
    it('converts dollars to minor correctly', () => {
      expect(dollarsToMinor(10)).toBe(1000)
      expect(dollarsToMinor(1.5)).toBe(150)
      expect(dollarsToMinor(1.05)).toBe(105)
    })

    it('throws error for negative or zero amounts', () => {
      expect(() => dollarsToMinor(0)).toThrow('Enter an amount greater than zero')
      expect(() => dollarsToMinor(-10)).toThrow('Enter an amount greater than zero')
    })
  })

  describe('formatUsd', () => {
    it('formats minor amounts to USD string', () => {
      expect(formatUsd(1000)).toBe('$10.00')
      expect(formatUsd(150)).toBe('$1.50')
      expect(formatUsd(0)).toBe('$0.00')
    })
  })

  describe('formatBps', () => {
    it('formats basis points to percentage', () => {
      expect(formatBps(100)).toBe('1%')
      expect(formatBps(150)).toBe('1.5%')
      expect(formatBps(10000)).toBe('100%')
    })

    it('handles null or undefined gracefully', () => {
      expect(formatBps(null)).toBe('—')
      expect(formatBps(undefined)).toBe('—')
    })
  })

  describe('formatDollars', () => {
    it('formats normal dollars to USD string', () => {
      expect(formatDollars(10)).toBe('$10.00')
      expect(formatDollars(1.5)).toBe('$1.50')
    })
  })
})
