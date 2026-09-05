import { PageThumbnailService } from '../src/services/PageThumbnailService'

async function main() {
  const service = new PageThumbnailService()
  const enqueued = await service.regenerateAllSystemLayouts()
  console.log(`Enqueued ${enqueued} system layout thumbnails`)
  let remaining = enqueued
  while (remaining > 0) {
    const processed = await service.processPending(5)
    if (processed === 0) break
    remaining -= processed
    console.log(`Processed batch of ${processed}; ~${Math.max(0, remaining)} left`)
  }
  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
