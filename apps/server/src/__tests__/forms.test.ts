// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('forms API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listForms
    
    // listForms - auth check
    try {
      if (!'/forms'.includes('{') || createdIds['forms']) {
        const reslistFormsAuth = await app.inject({ method: 'GET', url: `/forms` })
        expect(reslistFormsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listForms auth failed: ' + e.message))
    }

    try {
      if (!'/forms'.includes('{') || createdIds['forms']) {
        const reslistForms = await app.inject({
          method: 'GET',
          url: `/forms`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistForms.statusCode !== 200) {
          console.error('listForms failed with ' + reslistForms.statusCode, reslistForms.json().message || reslistForms.json())
        }
        expect(reslistForms.statusCode).toBe(200)
        await validateResponse('listForms', 200, reslistForms.json())
      }
    } catch (e: any) {
      errors.push(new Error('listForms failed: ' + e.message))
    }

    // createForm
    
    // createForm - auth check
    try {
      if (!'/forms'.includes('{') || createdIds['forms']) {
        const rescreateFormAuth = await app.inject({ method: 'POST', url: `/forms` })
        expect(rescreateFormAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createForm auth failed: ' + e.message))
    }

    try {
      if (!'/forms'.includes('{') || createdIds['forms']) {
        const rescreateForm = await app.inject({
          method: 'POST',
          url: `/forms`,
          headers: asAuth(testUserId),
          payload: {
  "name": "test_string",
  "fields": [
    {
      "label": "test_string",
      "fieldKey": "test_string",
      "type": "TEXT"
    }
  ]
},
        })
        if (rescreateForm.statusCode === 201 && rescreateForm.json().data?.id) createdIds['forms'] = rescreateForm.json().data.id
        if (rescreateForm.statusCode !== 201) {
          console.error('createForm failed with ' + rescreateForm.statusCode, rescreateForm.json().message || rescreateForm.json())
        }
        expect(rescreateForm.statusCode).toBe(201)
        await validateResponse('createForm', 201, rescreateForm.json())
      }
    } catch (e: any) {
      errors.push(new Error('createForm failed: ' + e.message))
    }

    // getForm
    
    // getForm - auth check
    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resgetFormAuth = await app.inject({ method: 'GET', url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetFormAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getForm auth failed: ' + e.message))
    }

    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resgetForm = await app.inject({
          method: 'GET',
          url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetForm.statusCode !== 200) {
          console.error('getForm failed with ' + resgetForm.statusCode, resgetForm.json().message || resgetForm.json())
        }
        expect(resgetForm.statusCode).toBe(200)
        await validateResponse('getForm', 200, resgetForm.json())
      }
    } catch (e: any) {
      errors.push(new Error('getForm failed: ' + e.message))
    }

    // updateForm
    
    // updateForm - auth check
    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resupdateFormAuth = await app.inject({ method: 'PATCH', url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateFormAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateForm auth failed: ' + e.message))
    }

    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resupdateForm = await app.inject({
          method: 'PATCH',
          url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateForm.statusCode !== 200) {
          console.error('updateForm failed with ' + resupdateForm.statusCode, resupdateForm.json().message || resupdateForm.json())
        }
        expect(resupdateForm.statusCode).toBe(200)
        await validateResponse('updateForm', 200, resupdateForm.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateForm failed: ' + e.message))
    }

    // deleteForm
    
    // deleteForm - auth check
    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resdeleteFormAuth = await app.inject({ method: 'DELETE', url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resdeleteFormAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteForm auth failed: ' + e.message))
    }

    try {
      if (!'/forms/{formId}'.includes('{') || createdIds['forms']) {
        const resdeleteForm = await app.inject({
          method: 'DELETE',
          url: `/forms/${createdIds['forms'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteForm.statusCode !== 200) {
          console.error('deleteForm failed with ' + resdeleteForm.statusCode, resdeleteForm.json().message || resdeleteForm.json())
        }
        expect(resdeleteForm.statusCode).toBe(200)
        await validateResponse('deleteForm', 200, resdeleteForm.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteForm failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
