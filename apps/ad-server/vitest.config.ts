import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/__tests__/helpers/testSafety.ts'],
    // Same dedicated-test-DB rule as apps/server/vitest.config.ts — see that file's comment.
    // adServe.test.ts is self-contained (creates/deletes its own rows in beforeAll/afterAll)
    // so it's lower-risk than the global-wipe suite, but there's no reason to run it against
    // the shared dev DB either.
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'mysql://loopie:loopie_dev_password@localhost:3306/loopie_test',
    },
  },
})
