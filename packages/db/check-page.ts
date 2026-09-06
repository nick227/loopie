import { db } from './src/client'
import type { Prisma } from '@prisma/client'
async function main() {
  const business = await db.business.findFirst()
  if (!business) return console.log('No business found')

  const template = await db.landingPageTemplate.findUnique({
    where: { id: 'system-template-corporate-professional' },
  })

  type SchemaWithBlocks = { blocks?: unknown[] }
  console.log(
    'TEMPLATE HAS BLOCKS?',
    !!(template?.schema as unknown as SchemaWithBlocks | undefined)?.blocks,
  )

  const page = await db.landingPage.create({
    data: {
      businessId: business.id,
      templateId: 'system-template-corporate-professional',
      name: 'Test Page',
      slug: 'test-page-' + Date.now(),
      content: template?.schema as Prisma.InputJsonValue,
    },
  })

  const content = page.content as unknown as SchemaWithBlocks
  console.log('CREATED PAGE HAS BLOCKS?', !!content?.blocks)
  console.log('NUM BLOCKS:', content?.blocks?.length)
}
main()
  .catch(console.error)
  .finally(() => process.exit(0))
