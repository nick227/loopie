import { PrismaClient } from '@prisma/client'
import { canonicalJson } from '../../embed-contract/src/canonical'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting backfill for PublishedPageVersion...')
  const versions = await prisma.publishedPageVersion.findMany({
    where: {
      checksum: null,
    },
  })

  let count = 0
  for (const version of versions) {
    const payload = {
      content: version.content,
      theme: version.theme,
      layoutConfig: version.layoutConfig,
      formSnapshot: version.formSnapshot,
      schemaSnapshot: version.schemaSnapshot,
      formatVersion: version.formatVersion,
    }

    const canonicalStr = canonicalJson(payload as any)
    const hash = crypto.createHash('sha256').update(canonicalStr, 'utf-8').digest('hex')

    await prisma.publishedPageVersion.update({
      where: { id: version.id },
      data: {
        checksum: hash,
        successBehavior: { type: 'INLINE' },
      },
    })
    count++
  }

  console.log(`Backfilled ${count} records.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
