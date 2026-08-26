import { beforeAll, beforeEach, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import openapiGlue from 'fastify-openapi-glue'
import SwaggerParser from '@apidevtools/swagger-parser'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { resolve } from 'path'
import { db } from '@project/db'
import * as handlers from '../../handlers'
import { mapErrorToReply } from '../../plugins/errorHandler'

// Two seeded users available in every test — use testOtherUserId for
// cross-user permission tests (e.g. "user A cannot see user B's contact")
export const testUserId = '00000000-0000-0000-0000-000000000001'
export const testOtherUserId = '00000000-0000-0000-0000-000000000002'
export const testBusinessId = '00000000-0000-0000-0000-000000000011'
export const testOtherBusinessId = '00000000-0000-0000-0000-000000000012'

const specPath = resolve(__dirname, '../../../../../packages/api-spec/openapi.yaml')

let derefSpec: any
async function getSpec() {
  if (!derefSpec) derefSpec = await SwaggerParser.dereference(specPath)
  return derefSpec
}

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

// Seeds one Business + User per test user before each test.
// setup.ts deletes them in afterEach — this re-creates them for the next test.
async function seedTestUsers() {
  await db.business.createMany({
    data: [
      { id: testBusinessId, name: 'Alice Co.' },
      { id: testOtherBusinessId, name: 'Bob Co.' },
    ],
    skipDuplicates: true,
  })
  await db.user.createMany({
    data: [
      { id: testUserId, email: 'alice@test.local', passwordHash: 'x', businessId: testBusinessId },
      { id: testOtherUserId, email: 'bob@test.local', passwordHash: 'x', businessId: testOtherBusinessId },
    ],
    skipDuplicates: true,
  })
}

export function buildTestApp() {
  const app: FastifyInstance = Fastify()

  beforeAll(async () => {
    await app.register(cookie, {
      secret: process.env.COOKIE_SECRET ?? 'test-cookie-secret-at-least-32-characters',
    })
    app.setErrorHandler((error, request, reply) => mapErrorToReply(error, reply, request.log))
    await app.register(openapiGlue, {
      specification: specPath,
      service: handlers,
      securityHandlers: {
        // Test auth: accept "Bearer <userId>" directly — no session lookup or bcrypt.
        // Tests are not testing the auth transport; they're testing business logic.
        async bearerAuth(request: any) {
          const id = request.headers.authorization?.replace('Bearer ', '')
          if (!id) throw { statusCode: 401, message: 'Unauthorized' }
          request.user = await db.user.findUniqueOrThrow({
            where: { id },
            include: { business: true },
          })
        },
      },
      noAdditional: true,
    } as any)
    await app.ready()
  })

  // Seed test users before every test so asAuth() works without per-test setup.
  // Domain data (contacts, campaigns, etc.) is still seeded per-test.
  beforeEach(async () => {
    await seedTestUsers()
  })

  afterAll(() => app.close())

  return app
}

export function asAuth(userId: string) {
  return { Authorization: `Bearer ${userId}` }
}

export async function validateResponse(operationId: string, status: number, body: unknown) {
  const spec = await getSpec()
  for (const pathItem of Object.values<any>(spec.paths ?? {})) {
    for (const op of Object.values<any>(pathItem)) {
      if (op.operationId !== operationId) continue
      const schema = op.responses?.[status]?.content?.['application/json']?.schema
      if (!schema) return
      const validate = ajv.compile(schema)
      if (!validate(body)) {
        throw new Error(
          `${operationId} ${status} response does not match spec:\n` + JSON.stringify(validate.errors, null, 2),
        )
      }
      return
    }
  }
}
