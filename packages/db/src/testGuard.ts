// Structural safety net for "loopie_test must stay permanently isolated from dev data" — used by
// both apps/server and apps/ad-server's test setup. vitest.config.ts already defaults
// DATABASE_URL to loopie_test, but a *default* is only a convention: an env file mistake, a CI
// environment that doesn't source TEST_DATABASE_URL, or a future config refactor could all
// silently point the suite at the real `loopie` database. Since these suites wipe entire tables
// in afterEach (see references/testing-patterns.md), that would be destructive, not just wrong —
// exactly the kind of drift CLAUDE.md's "Shared Database Policy" section describes discovering
// after the fact. This throws immediately and loudly instead.
export function assertTestDatabaseUrl(url: string | undefined): void {
  if (!url || !/test/i.test(url)) {
    throw new Error(
      `Refusing to run: DATABASE_URL does not look like a dedicated test database (got: ${url ?? '(unset)'}). ` +
        'This test suite wipes entire tables between tests. Set TEST_DATABASE_URL to a database whose name ' +
        'contains "test" (see apps/server/vitest.config.ts / apps/ad-server/vitest.config.ts).',
    )
  }
}
