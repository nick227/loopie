// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('assets API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createAsset

    // createAsset - auth check
    try {
      if (!'/assets'.includes('{') || createdIds['assets']) {
        const rescreateAssetAuth = await app.inject({ method: 'POST', url: `/assets` })
        expect(rescreateAssetAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAsset auth failed: ' + e.message))
    }

    try {
      if (!'/assets'.includes('{') || createdIds['assets']) {
        const rescreateAsset = await app.inject({
          method: 'POST',
          url: `/assets`,
          headers: asAuth(testUserId),
          payload: {
            type: 'IMAGE',
            name: 'test_string',
          },
        })
        if (rescreateAsset.statusCode === 201 && rescreateAsset.json().data?.id)
          createdIds['assets'] = rescreateAsset.json().data.id
        if (rescreateAsset.statusCode !== 201) {
          console.error(
            'createAsset failed with ' + rescreateAsset.statusCode,
            rescreateAsset.json().message || rescreateAsset.json(),
          )
        }
        expect(rescreateAsset.statusCode).toBe(201)
        await validateResponse('createAsset', 201, rescreateAsset.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAsset failed: ' + e.message))
    }

    // listAssets

    // listAssets - auth check
    try {
      if (!'/assets'.includes('{') || createdIds['assets']) {
        const reslistAssetsAuth = await app.inject({ method: 'GET', url: `/assets` })
        expect(reslistAssetsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAssets auth failed: ' + e.message))
    }

    try {
      if (!'/assets'.includes('{') || createdIds['assets']) {
        const reslistAssets = await app.inject({
          method: 'GET',
          url: `/assets`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAssets.statusCode !== 200) {
          console.error(
            'listAssets failed with ' + reslistAssets.statusCode,
            reslistAssets.json().message || reslistAssets.json(),
          )
        }
        expect(reslistAssets.statusCode).toBe(200)
        await validateResponse('listAssets', 200, reslistAssets.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAssets failed: ' + e.message))
    }

    // getAsset

    // getAsset - auth check
    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resgetAssetAuth = await app.inject({
          method: 'GET',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetAssetAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAsset auth failed: ' + e.message))
    }

    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resgetAsset = await app.inject({
          method: 'GET',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAsset.statusCode !== 200) {
          console.error(
            'getAsset failed with ' + resgetAsset.statusCode,
            resgetAsset.json().message || resgetAsset.json(),
          )
        }
        expect(resgetAsset.statusCode).toBe(200)
        await validateResponse('getAsset', 200, resgetAsset.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAsset failed: ' + e.message))
    }

    // updateAsset

    // updateAsset - auth check
    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resupdateAssetAuth = await app.inject({
          method: 'PATCH',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateAssetAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAsset auth failed: ' + e.message))
    }

    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resupdateAsset = await app.inject({
          method: 'PATCH',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAsset.statusCode !== 200) {
          console.error(
            'updateAsset failed with ' + resupdateAsset.statusCode,
            resupdateAsset.json().message || resupdateAsset.json(),
          )
        }
        expect(resupdateAsset.statusCode).toBe(200)
        await validateResponse('updateAsset', 200, resupdateAsset.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAsset failed: ' + e.message))
    }

    // deleteAsset

    // deleteAsset - auth check
    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resdeleteAssetAuth = await app.inject({
          method: 'DELETE',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteAssetAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteAsset auth failed: ' + e.message))
    }

    try {
      if (!'/assets/{assetId}'.includes('{') || createdIds['assets']) {
        const resdeleteAsset = await app.inject({
          method: 'DELETE',
          url: `/assets/${createdIds['assets'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteAsset.statusCode !== 200) {
          console.error(
            'deleteAsset failed with ' + resdeleteAsset.statusCode,
            resdeleteAsset.json().message || resdeleteAsset.json(),
          )
        }
        expect(resdeleteAsset.statusCode).toBe(200)
        await validateResponse('deleteAsset', 200, resdeleteAsset.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteAsset failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
