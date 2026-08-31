// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('templates API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createTemplate

    // createTemplate - auth check
    try {
      if (!'/templates'.includes('{') || createdIds['templates']) {
        const rescreateTemplateAuth = await app.inject({ method: 'POST', url: `/templates` })
        expect(rescreateTemplateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createTemplate auth failed: ' + e.message))
    }

    try {
      if (!'/templates'.includes('{') || createdIds['templates']) {
        const rescreateTemplate = await app.inject({
          method: 'POST',
          url: `/templates`,
          headers: asAuth(testUserId),
          payload: {
            name: 'test_string',
            channel: 'EMAIL',
            body: 'test_string',
          },
        })
        if (rescreateTemplate.statusCode === 201 && rescreateTemplate.json().data?.id)
          createdIds['templates'] = rescreateTemplate.json().data.id
        if (rescreateTemplate.statusCode !== 201) {
          console.error(
            'createTemplate failed with ' + rescreateTemplate.statusCode,
            rescreateTemplate.json().message || rescreateTemplate.json(),
          )
        }
        expect(rescreateTemplate.statusCode).toBe(201)
        await validateResponse('createTemplate', 201, rescreateTemplate.json())
      }
    } catch (e: any) {
      errors.push(new Error('createTemplate failed: ' + e.message))
    }

    // listTemplates

    // listTemplates - auth check
    try {
      if (!'/templates'.includes('{') || createdIds['templates']) {
        const reslistTemplatesAuth = await app.inject({ method: 'GET', url: `/templates` })
        expect(reslistTemplatesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listTemplates auth failed: ' + e.message))
    }

    try {
      if (!'/templates'.includes('{') || createdIds['templates']) {
        const reslistTemplates = await app.inject({
          method: 'GET',
          url: `/templates`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistTemplates.statusCode !== 200) {
          console.error(
            'listTemplates failed with ' + reslistTemplates.statusCode,
            reslistTemplates.json().message || reslistTemplates.json(),
          )
        }
        expect(reslistTemplates.statusCode).toBe(200)
        await validateResponse('listTemplates', 200, reslistTemplates.json())
      }
    } catch (e: any) {
      errors.push(new Error('listTemplates failed: ' + e.message))
    }

    // getTemplate

    // getTemplate - auth check
    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resgetTemplateAuth = await app.inject({
          method: 'GET',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetTemplateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getTemplate auth failed: ' + e.message))
    }

    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resgetTemplate = await app.inject({
          method: 'GET',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetTemplate.statusCode !== 200) {
          console.error(
            'getTemplate failed with ' + resgetTemplate.statusCode,
            resgetTemplate.json().message || resgetTemplate.json(),
          )
        }
        expect(resgetTemplate.statusCode).toBe(200)
        await validateResponse('getTemplate', 200, resgetTemplate.json())
      }
    } catch (e: any) {
      errors.push(new Error('getTemplate failed: ' + e.message))
    }

    // updateTemplate

    // updateTemplate - auth check
    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resupdateTemplateAuth = await app.inject({
          method: 'PATCH',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateTemplateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateTemplate auth failed: ' + e.message))
    }

    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resupdateTemplate = await app.inject({
          method: 'PATCH',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateTemplate.statusCode !== 200) {
          console.error(
            'updateTemplate failed with ' + resupdateTemplate.statusCode,
            resupdateTemplate.json().message || resupdateTemplate.json(),
          )
        }
        expect(resupdateTemplate.statusCode).toBe(200)
        await validateResponse('updateTemplate', 200, resupdateTemplate.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateTemplate failed: ' + e.message))
    }

    // deleteTemplate

    // deleteTemplate - auth check
    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resdeleteTemplateAuth = await app.inject({
          method: 'DELETE',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteTemplateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteTemplate auth failed: ' + e.message))
    }

    try {
      if (!'/templates/{templateId}'.includes('{') || createdIds['templates']) {
        const resdeleteTemplate = await app.inject({
          method: 'DELETE',
          url: `/templates/${createdIds['templates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteTemplate.statusCode !== 200) {
          console.error(
            'deleteTemplate failed with ' + resdeleteTemplate.statusCode,
            resdeleteTemplate.json().message || resdeleteTemplate.json(),
          )
        }
        expect(resdeleteTemplate.statusCode).toBe(200)
        await validateResponse('deleteTemplate', 200, resdeleteTemplate.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteTemplate failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
