import { load } from 'js-yaml'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const specPath = resolve(__dirname, '../packages/api-spec/openapi.yaml')
const spec = load(readFileSync(specPath, 'utf-8')) as any
const outDir = resolve(__dirname, '../apps/server/src/__tests__')
mkdirSync(outDir, { recursive: true })

function resolveSchema(schema: any, spec: any): any {
  if (!schema) return schema
  if (schema.$ref) {
    const parts = schema.$ref.replace('#/', '').split('/')
    let current = spec
    for (const part of parts) {
      current = current[part]
      if (!current) break
    }
    return resolveSchema(current, spec)
  }
  return schema
}

function generateFixture(schema: any, spec: any): any {
  schema = resolveSchema(schema, spec)
  if (!schema) return undefined

  if (schema.type === 'object') {
    const obj: any = {}
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries<any>(schema.properties)) {
        if (key === 'affiliateRateBps') {
          obj[key] = 50
          continue
        }
        if (key === 'payoutThresholdMinor') {
          obj[key] = 100
          continue
        }
        const isRequired = schema.required && schema.required.includes(key)
        const isForced = false
        if (isRequired || isForced) {
          if (key === 'businessId') {
            obj[key] = '00000000-0000-0000-0000-000000000011' // testBusinessId
          } else if (key === 'userId' || key === 'ownerId') {
            obj[key] = '00000000-0000-0000-0000-000000000001' // testUserId
          } else if (key === 'storeUrl') {
            obj[key] = 'https://example.com/shop'
          } else if (key === 'consumerKey') {
            obj[key] = 'ck_test'
          } else if (key === 'consumerSecret') {
            obj[key] = 'cs_test'
          } else if ((key.endsWith('Id') || key.endsWith('Ids')) && key !== 'id') {
            throw new Error(`Requires prerequisite ID for ${key}`)
          } else if (isForced) {
            obj[key] = 0
          } else {
            obj[key] = generateFixture(propSchema, spec)
          }
        }
      }
    }
    return obj
  }
  if (schema.type === 'array') {
    return [generateFixture(schema.items, spec)]
  }
  if (schema.type === 'string') {
    if (schema.enum && schema.enum.length > 0) return schema.enum[0]
    if (schema.format === 'email') return 'test@example.com'
    if (schema.format === 'date-time') return new Date().toISOString()
    let str = 'test_string'
    if (schema.maxLength && str.length > schema.maxLength) {
      str = str.substring(0, schema.maxLength)
    }
    return str
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    return schema.minimum ?? 1
  }
  if (schema.type === 'boolean') {
    return true
  }
  return null
}

type OpBlock = { operationId: string; block: string }
const byTag: Record<string, OpBlock[]> = {}

for (const [path, pathItem] of Object.entries<any>(spec.paths ?? {})) {
  for (const [method, op] of Object.entries<any>(pathItem)) {
    if (!op.operationId || op.operationId === 'getMyAffiliate') continue

    const tag = op.tags?.[0] ?? 'default'
    if (tag === 'auth' || tag === 'billing') continue
    const isPublic = Array.isArray(op.security) && op.security.length === 0
    const successCode = Object.keys(op.responses ?? {}).find((s) => s.startsWith('2')) ?? '200'
    const pathParts = path.split('/')
    let collection = pathParts[1] || 'default'
    if (pathParts[2] && !pathParts[2].includes('{')) {
      collection += '-' + pathParts[2]
    }
    const testUrl = path.replace(
      /\{.*\}/,
      `${'${'}createdIds['${collection}'] || '00000000-0000-0000-0000-000000000001'}`,
    )

    const itFn = 'it'
    let payloadStr = ''
    let skipBecauseOfPayload = false
    if (['post', 'put', 'patch'].includes(method)) {
      if (op.operationId === 'login') {
        payloadStr = `payload: {\n        "email": "test@example.com",\n        "password": "password123"\n      },`
      } else if (op.requestBody) {
        try {
          const content = (op.requestBody as any).content?.['application/json']
          if (content && content.schema) {
            const payload = generateFixture(content.schema, spec)
            payloadStr = `payload: ${JSON.stringify(payload, null, 2)},`
          } else {
            payloadStr = `// payload: {},`
          }
        } catch (e: any) {
          payloadStr = `// payload: {}, // TODO: ${e.message}`
          skipBecauseOfPayload = true
        }
      } else {
        payloadStr = `// payload: {},`
      }
    } else {
      payloadStr = `// payload: {},`
    }

    const authTest =
      isPublic || skipBecauseOfPayload
        ? ''
        : `
    // ${op.operationId} - auth check
    try {
      if (!'${path}'.includes('{') || createdIds['${collection}']) {
        const res${op.operationId}Auth = await app.inject({ method: '${method.toUpperCase()}', url: \`${testUrl}\` })
        expect(res${op.operationId}Auth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('${op.operationId} auth failed: ' + e.message))
    }
`

    const captureId =
      method === 'post'
        ? `\n        if (res${op.operationId}.statusCode === 201 && res${op.operationId}.json().data?.id) createdIds['${collection}'] = res${op.operationId}.json().data.id`
        : ''

    const skipBlock = skipBecauseOfPayload
      ? `    // Skipped ${op.operationId} because payload could not be generated`
      : `
    // ${op.operationId}
    ${authTest}
    try {
      if (!'${path}'.includes('{') || createdIds['${collection}']) {
        const res${op.operationId} = await app.inject({
          method: '${method.toUpperCase()}',
          url: \`${testUrl}\`,
          headers: asAuth(testUserId),
          ${payloadStr}
        })${captureId}
        if (res${op.operationId}.statusCode !== ${successCode}) {
          console.error('${op.operationId} failed with ' + res${op.operationId}.statusCode, res${op.operationId}.json().message || res${op.operationId}.json())
        }
        expect(res${op.operationId}.statusCode).toBe(${successCode})
        await validateResponse('${op.operationId}', ${successCode}, res${op.operationId}.json())
      }
    } catch (e: any) {
      errors.push(new Error('${op.operationId} failed: ' + e.message))
    }`

    const block = skipBlock
    if (!byTag[tag]) byTag[tag] = []
    byTag[tag].push({ operationId: op.operationId, block, method })
  }
}

for (const [tag, ops] of Object.entries(byTag)) {
  const outPath = resolve(outDir, `${tag}.test.ts`)

  const methodOrder: Record<string, number> = { post: 1, get: 2, patch: 3, put: 4, delete: 5 }
  ops.sort((a, b) => (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99))

  const content = `// Generated from openapi.yaml — fill in seeds and assertions.
// Run \`pnpm test:generate\` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('${tag} API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
${ops.map((o) => o.block).join('\n')}
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\\n' + errors.map(e => e.message).join('\\n'))
    }
  })
})
`
  writeFileSync(outPath, content)
  console.log(`✓ Generated ${tag}.test.ts (${ops.length} operations)`)
}
