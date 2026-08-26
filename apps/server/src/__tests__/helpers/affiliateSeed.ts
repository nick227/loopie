import type { FastifyInstance } from 'fastify'
import { asAuth, testUserId } from './index'

export async function seedClassAndDeal(
  app: FastifyInstance,
  overrides: Record<string, unknown> = {},
) {
  const classRes = await app.inject({
    method: 'POST',
    url: '/affiliate-classes',
    headers: asAuth(testUserId),
    payload: { name: 'Field Rep', maxAffiliateRateBps: 5000, maxManagerShareBps: 5000 },
  })
  if (classRes.statusCode !== 201) throw new Error(`class create ${classRes.statusCode}: ${classRes.body}`)
  const classId = classRes.json().data.id as string

  const dealRes = await app.inject({
    method: 'POST',
    url: '/affiliate-deals',
    headers: asAuth(testUserId),
    payload: {
      name: 'Standard 10',
      classId,
      affiliateRateBps: 1000,
      managerShareBps: 0,
      ...overrides,
    },
  })
  if (dealRes.statusCode !== 201) throw new Error(`deal create ${dealRes.statusCode}: ${dealRes.body}`)
  const dealId = dealRes.json().data.id as string

  await app.inject({
    method: 'PATCH',
    url: `/affiliate-classes/${classId}`,
    headers: asAuth(testUserId),
    payload: { defaultDealId: dealId },
  })

  return { classId, dealId }
}
