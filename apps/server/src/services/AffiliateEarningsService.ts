import { db } from '@project/db'
import { findAffiliate } from './affiliateDto'
import type { AuthedUser } from '../lib/affiliateRoles'

export class AffiliateEarningsService {
  async get(user: AuthedUser, affiliateId: string) {
    const row = await findAffiliate(user.businessId, affiliateId)
    if (user.role !== 'ADMIN') {
      const me = await db.affiliate.findFirst({
        where: { userId: user.id, businessId: user.businessId },
      })
      if (!me || (row.id !== me.id && row.managerId !== me.id))
        throw { statusCode: 403, message: 'Forbidden' }
    }
    const payeeRef = `affiliate:${row.id}`
    const commissions = await db.commission.findMany({
      where: { businessId: user.businessId, payeeRef },
      orderBy: { createdAt: 'desc' },
    })
    const payouts = await db.payout.findMany({
      where: { businessId: user.businessId, payeeRef },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    const sum = (status: string) =>
      commissions.filter((c) => c.status === status).reduce((n, c) => n + c.amountMinor, 0)
    return {
      pendingMinor: sum('PENDING'),
      payableMinor: sum('PAYABLE'),
      paidMinor: sum('PAID'),
      commissions: commissions.map((c) => ({
        id: c.id,
        amountMinor: c.amountMinor,
        currency: c.currency,
        status: c.status,
        sourceRef: c.sourceRef,
        createdAt: c.createdAt.toISOString(),
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        commissionIds: p.items.map((item) => item.commissionId),
        createdAt: p.createdAt.toISOString(),
      })),
    }
  }
}
