import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/__tests__/helpers/setup.ts'],
    testTimeout: 15000,
    // Every test file shares one real database and setup.ts's afterEach wipes ALL business/
    // user/contact/... rows globally (not scoped per file). Running files in parallel (Vitest's
    // default) lets one file's cleanup delete another file's mid-test data — races, not real
    // bugs. Force serial file execution until/unless test isolation moves to per-file schemas
    // or transactional rollback.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
