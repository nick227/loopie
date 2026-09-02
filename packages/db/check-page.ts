import { db } from './src/client'
async function main() {
  const business = await db.business.findFirst()
  if (!business) return console.log('No business found')

  const template = await db.landingPageTemplate.findUnique({
    where: { id: 'system-template-corporate-professional' },
  })

  console.log('TEMPLATE HAS BLOCKS?', !!(template?.schema as any)?.blocks)

  const page = await db.landingPage.create({
    data: {
      businessId: business.id,
      templateId: 'system-template-corporate-professional',
      name: 'Test Page',
      slug: 'test-page-' + Date.now(),
      content: template?.schema as any,
    },
  })

  console.log('CREATED PAGE HAS BLOCKS?', !!(page.content as any)?.blocks)
  console.log('NUM BLOCKS:', (page.content as any)?.blocks?.length)
}
main()
  .catch(console.error)
  .finally(() => process.exit(0))
