import { db } from '@project/db'

export async function requireAudience(businessId: string, audienceId: string) {
  const row = await db.audience.findFirst({ where: { id: audienceId, businessId } })
  if (!row) throw { statusCode: 404, message: 'Audience not found' }
  return row
}

export async function requireTemplate(businessId: string, templateId: string) {
  const row = await db.template.findFirst({ where: { id: templateId, businessId, deletedAt: null } })
  if (!row) throw { statusCode: 404, message: 'Template not found' }
  return row
}

export async function requireAutomation(businessId: string, automationId: string) {
  const row = await db.automation.findFirst({ where: { id: automationId, businessId } })
  if (!row) throw { statusCode: 404, message: 'Automation not found' }
  return row
}

export async function requireAsset(businessId: string, assetId: string) {
  const row = await db.asset.findFirst({ where: { id: assetId, businessId, deletedAt: null } })
  if (!row) throw { statusCode: 404, message: 'Asset not found' }
  return row
}

export async function requireAssets(businessId: string, assetIds: string[]) {
  const uniqueIds = [...new Set(assetIds)]
  if (!uniqueIds.length) return
  const rows = await db.asset.findMany({ where: { id: { in: uniqueIds }, businessId, deletedAt: null } })
  if (rows.length !== uniqueIds.length) throw { statusCode: 404, message: 'Asset not found' }
}

export async function requireCreatives(businessId: string, creativeIds: string[]) {
  const uniqueIds = [...new Set(creativeIds)]
  if (!uniqueIds.length) return
  const rows = await db.creative.findMany({ where: { id: { in: uniqueIds }, businessId, deletedAt: null } })
  if (rows.length !== uniqueIds.length) throw { statusCode: 404, message: 'Creative not found' }
}

export async function requireCreative(businessId: string, creativeId: string) {
  const row = await db.creative.findFirst({ where: { id: creativeId, businessId, deletedAt: null } })
  if (!row) throw { statusCode: 404, message: 'Creative not found' }
  return row
}

export async function requireContacts(businessId: string, contactIds: string[]) {
  const uniqueIds = [...new Set(contactIds)]
  if (!uniqueIds.length) return
  const rows = await db.contact.findMany({ where: { id: { in: uniqueIds }, businessId, deletedAt: null } })
  if (rows.length !== uniqueIds.length) throw { statusCode: 404, message: 'Contact not found' }
}
