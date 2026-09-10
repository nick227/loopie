import { defineConfig } from 'vitest/config'

// Browser capture tests have no database dependency or global database cleanup.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/__tests__/pageThumbnailCapture.test.ts',
      'src/__tests__/adCreativeCapture.test.ts',
    ],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})
