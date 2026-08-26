import { assertTestDatabaseUrl } from '@project/db'

// Hard safety net, not just a config default: this service's tests create/delete real rows
// (e.g. adServe.test.ts's beforeAll/afterAll), so a misconfigured DATABASE_URL must fail loudly
// here rather than silently touching a non-test database. See apps/server's helpers/setup.ts for
// the equivalent guard and CLAUDE.md's "Shared Database Policy" for the incident this protects
// against.
assertTestDatabaseUrl(process.env.DATABASE_URL)
