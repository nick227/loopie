import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getBusinessLicenseState, requireActiveLicense } from './licensing'
import { db } from '@project/db'

vi.mock('@project/db', () => ({
  db: {
    businessLicense: {
      findUnique: vi.fn(),
    },
  },
}))

describe('getBusinessLicenseState', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns unentitled when no license exists', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue(null)
    const state = await getBusinessLicenseState('biz-1')
    expect(state.isEntitled).toBe(false)
    expect(state.status).toBe('SUSPENDED')
  })

  it('returns entitled for ACTIVE license with future endsAt', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue({
      id: 'lic-1',
      businessId: 'biz-1',
      status: 'ACTIVE',
      startsAt: new Date('2025-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'),
      source: 'MANUAL',
      grantedByUserId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const state = await getBusinessLicenseState('biz-1')
    expect(state.isEntitled).toBe(true)
    expect(state.status).toBe('ACTIVE')
  })

  it('returns unentitled when ACTIVE but endsAt is in the past', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue({
      id: 'lic-1',
      businessId: 'biz-1',
      status: 'ACTIVE',
      startsAt: new Date('2025-01-01T00:00:00Z'),
      endsAt: new Date('2025-12-31T00:00:00Z'), // Past
      source: 'MANUAL',
      grantedByUserId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const state = await getBusinessLicenseState('biz-1')
    expect(state.isEntitled).toBe(false)
    expect(state.status).toBe('EXPIRED')
  })

  it('returns unentitled when explicitly SUSPENDED regardless of dates', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue({
      id: 'lic-1',
      businessId: 'biz-1',
      status: 'SUSPENDED',
      startsAt: new Date('2025-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'), // Future
      source: 'MANUAL',
      grantedByUserId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const state = await getBusinessLicenseState('biz-1')
    expect(state.isEntitled).toBe(false)
    expect(state.status).toBe('SUSPENDED')
  })
})

describe('requireActiveLicense', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not throw when entitled', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue({
      id: 'lic-1',
      businessId: 'biz-1',
      status: 'ACTIVE',
      startsAt: new Date('2025-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'),
      source: 'MANUAL',
      grantedByUserId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(requireActiveLicense('biz-1')).resolves.toBeUndefined()
  })

  it('throws 402 when not entitled', async () => {
    vi.mocked(db.businessLicense.findUnique).mockResolvedValue({
      id: 'lic-1',
      businessId: 'biz-1',
      status: 'SUSPENDED',
      startsAt: new Date('2025-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'),
      source: 'MANUAL',
      grantedByUserId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(requireActiveLicense('biz-1')).rejects.toEqual({
      statusCode: 402,
      message: 'Business license is suspended.',
    })
  })
})
