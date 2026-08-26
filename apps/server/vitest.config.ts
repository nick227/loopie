import { defineConfig } from 'vitest/config'

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'mysql://loopie:loopie_dev_password@localhost:3306/loopie_test'
// Must override a shell-exported DATABASE_URL. Vitest `test.env` does not win over an
// already-set variable, and PrismaClient reads DATABASE_URL at import time.
process.env.DATABASE_URL = testDatabaseUrl

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/__tests__/helpers/env.ts', './src/__tests__/helpers/setup.ts'],
    testTimeout: 15000,
    // setup.ts's afterEach wipes every business/finance/contact/... row globally — the shared
    // dev DB is no longer disposable test state now that finance/ledger and auth-hardening work
    // lives there too (2026-08-27). Tests always run against a dedicated database, never
    // whatever DATABASE_URL happens to be exported in the shell — override with
    // TEST_DATABASE_URL if loopie_test isn't the right name/credentials in a given environment.
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
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
