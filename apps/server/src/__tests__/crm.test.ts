// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect, vi } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('crm API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => [] }))

    // createIntegration

    // createIntegration - auth check
    try {
      if (!'/integrations'.includes('{') || createdIds['integrations']) {
        const rescreateIntegrationAuth = await app.inject({ method: 'POST', url: `/integrations` })
        expect(rescreateIntegrationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createIntegration auth failed: ' + e.message))
    }

    try {
      if (!'/integrations'.includes('{') || createdIds['integrations']) {
        const rescreateIntegration = await app.inject({
          method: 'POST',
          url: `/integrations`,
          headers: asAuth(testUserId),
          payload: {
            provider: 'WOOCOMMERCE',
            storeUrl: 'https://example.com/shop',
            consumerKey: 'ck_test',
            consumerSecret: 'cs_test',
          },
        })
        if (rescreateIntegration.statusCode === 201 && rescreateIntegration.json().data?.id)
          createdIds['integrations'] = rescreateIntegration.json().data.id
        if (rescreateIntegration.statusCode !== 201) {
          console.error(
            'createIntegration failed with ' + rescreateIntegration.statusCode,
            rescreateIntegration.json().message || rescreateIntegration.json(),
          )
        }
        expect(rescreateIntegration.statusCode).toBe(201)
        await validateResponse('createIntegration', 201, rescreateIntegration.json())
      }
    } catch (e: any) {
      errors.push(new Error('createIntegration failed: ' + e.message))
    }
    // Skipped ingestExternalEvent because payload could not be generated
    // Skipped resolveContactMatch because payload could not be generated

    // listCrmCatalog

    // listCrmCatalog - auth check
    try {
      if (!'/integrations/catalog'.includes('{') || createdIds['integrations-catalog']) {
        const reslistCrmCatalogAuth = await app.inject({
          method: 'GET',
          url: `/integrations/catalog`,
        })
        expect(reslistCrmCatalogAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listCrmCatalog auth failed: ' + e.message))
    }

    try {
      if (!'/integrations/catalog'.includes('{') || createdIds['integrations-catalog']) {
        const reslistCrmCatalog = await app.inject({
          method: 'GET',
          url: `/integrations/catalog`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistCrmCatalog.statusCode !== 200) {
          console.error(
            'listCrmCatalog failed with ' + reslistCrmCatalog.statusCode,
            reslistCrmCatalog.json().message || reslistCrmCatalog.json(),
          )
        }
        expect(reslistCrmCatalog.statusCode).toBe(200)
        await validateResponse('listCrmCatalog', 200, reslistCrmCatalog.json())
      }
    } catch (e: any) {
      errors.push(new Error('listCrmCatalog failed: ' + e.message))
    }

    // listIntegrations

    // listIntegrations - auth check
    try {
      if (!'/integrations'.includes('{') || createdIds['integrations']) {
        const reslistIntegrationsAuth = await app.inject({ method: 'GET', url: `/integrations` })
        expect(reslistIntegrationsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listIntegrations auth failed: ' + e.message))
    }

    try {
      if (!'/integrations'.includes('{') || createdIds['integrations']) {
        const reslistIntegrations = await app.inject({
          method: 'GET',
          url: `/integrations`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistIntegrations.statusCode !== 200) {
          console.error(
            'listIntegrations failed with ' + reslistIntegrations.statusCode,
            reslistIntegrations.json().message || reslistIntegrations.json(),
          )
        }
        expect(reslistIntegrations.statusCode).toBe(200)
        await validateResponse('listIntegrations', 200, reslistIntegrations.json())
      }
    } catch (e: any) {
      errors.push(new Error('listIntegrations failed: ' + e.message))
    }

    // getIntegration

    // getIntegration - auth check
    try {
      if (!'/integrations/{integrationId}'.includes('{') || createdIds['integrations']) {
        const resgetIntegrationAuth = await app.inject({
          method: 'GET',
          url: `/integrations/${createdIds['integrations'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetIntegrationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getIntegration auth failed: ' + e.message))
    }

    try {
      if (!'/integrations/{integrationId}'.includes('{') || createdIds['integrations']) {
        const resgetIntegration = await app.inject({
          method: 'GET',
          url: `/integrations/${createdIds['integrations'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetIntegration.statusCode !== 200) {
          console.error(
            'getIntegration failed with ' + resgetIntegration.statusCode,
            resgetIntegration.json().message || resgetIntegration.json(),
          )
        }
        expect(resgetIntegration.statusCode).toBe(200)
        await validateResponse('getIntegration', 200, resgetIntegration.json())
      }
    } catch (e: any) {
      errors.push(new Error('getIntegration failed: ' + e.message))
    }

    // listContactMatches

    // listContactMatches - auth check
    try {
      if (!'/contact-matches'.includes('{') || createdIds['contact-matches']) {
        const reslistContactMatchesAuth = await app.inject({
          method: 'GET',
          url: `/contact-matches`,
        })
        expect(reslistContactMatchesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listContactMatches auth failed: ' + e.message))
    }

    try {
      if (!'/contact-matches'.includes('{') || createdIds['contact-matches']) {
        const reslistContactMatches = await app.inject({
          method: 'GET',
          url: `/contact-matches`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistContactMatches.statusCode !== 200) {
          console.error(
            'listContactMatches failed with ' + reslistContactMatches.statusCode,
            reslistContactMatches.json().message || reslistContactMatches.json(),
          )
        }
        expect(reslistContactMatches.statusCode).toBe(200)
        await validateResponse('listContactMatches', 200, reslistContactMatches.json())
      }
    } catch (e: any) {
      errors.push(new Error('listContactMatches failed: ' + e.message))
    }

    // updateIntegration

    // updateIntegration - auth check
    try {
      if (!'/integrations/{integrationId}'.includes('{') || createdIds['integrations']) {
        const resupdateIntegrationAuth = await app.inject({
          method: 'PATCH',
          url: `/integrations/${createdIds['integrations'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateIntegrationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateIntegration auth failed: ' + e.message))
    }

    try {
      if (!'/integrations/{integrationId}'.includes('{') || createdIds['integrations']) {
        const resupdateIntegration = await app.inject({
          method: 'PATCH',
          url: `/integrations/${createdIds['integrations'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateIntegration.statusCode !== 200) {
          console.error(
            'updateIntegration failed with ' + resupdateIntegration.statusCode,
            resupdateIntegration.json().message || resupdateIntegration.json(),
          )
        }
        expect(resupdateIntegration.statusCode).toBe(200)
        await validateResponse('updateIntegration', 200, resupdateIntegration.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateIntegration failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
