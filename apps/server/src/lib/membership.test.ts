import { describe, expect, it } from 'vitest'
import { requireBusinessOwner, requireSiteAdmin, type AuthUser } from './membership'

describe('Membership Authorization Guards', () => {
  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    isVerified: true,
    suspendedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    businessId: 'biz-1',
  }

  const baseBusiness = {
    id: 'biz-1',
    name: 'Acme',
    slug: 'acme',
    location: null,
    industry: null,
    targetAudience: null,
    contactEmail: null,
    contactPhone: null,
    iconUrl: null,
    identityCompletedAt: new Date(),
    stripeCustomerId: null,
    subscriptionStatus: null,
    subscriptionId: null,
    subscriptionPriceId: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
    publicSettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('requireSiteAdmin', () => {
    it('allows SITE_ADMIN platform role', () => {
      const user = {
        ...baseUser,
        platformRole: 'SITE_ADMIN' as const,
        business: baseBusiness,
        membershipRole: 'MEMBER' as const,
        isFounder: false,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireSiteAdmin(user)).not.toThrow()
    })

    it('denies USER platform role', () => {
      const user = {
        ...baseUser,
        platformRole: 'USER' as const,
        business: baseBusiness,
        membershipRole: 'OWNER' as const, // Even if owner of a business
        isFounder: true,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireSiteAdmin(user)).toThrow('Site admin only')
    })

    it('denies AFFILIATE platform role', () => {
      const user = {
        ...baseUser,
        platformRole: 'AFFILIATE' as const,
        business: baseBusiness,
        membershipRole: 'MEMBER' as const,
        isFounder: false,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireSiteAdmin(user)).toThrow('Site admin only')
    })
  })

  describe('requireBusinessOwner', () => {
    it('allows OWNER membership role', () => {
      const user = {
        ...baseUser,
        platformRole: 'USER' as const,
        business: baseBusiness,
        membershipRole: 'OWNER' as const,
        isFounder: true,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireBusinessOwner(user)).not.toThrow()
    })

    it('denies MEMBER membership role', () => {
      const user = {
        ...baseUser,
        platformRole: 'USER' as const,
        business: baseBusiness,
        membershipRole: 'MEMBER' as const,
        isFounder: false,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireBusinessOwner(user)).toThrow('Business owner only')
    })

    it('denies SITE_ADMIN if they are not a business OWNER', () => {
      // "SITE_ADMIN does not automatically pass requireBusinessOwner()"
      const user = {
        ...baseUser,
        platformRole: 'SITE_ADMIN' as const,
        business: baseBusiness,
        membershipRole: 'MEMBER' as const,
        isFounder: false,
        jobTitle: null,
      } as unknown as AuthUser
      expect(() => requireBusinessOwner(user)).toThrow('Business owner only')
    })
  })
})
