// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('contacts API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createContact

    // createContact - auth check
    try {
      if (!'/contacts'.includes('{') || createdIds['contacts']) {
        const rescreateContactAuth = await app.inject({ method: 'POST', url: `/contacts` })
        expect(rescreateContactAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createContact auth failed: ' + e.message))
    }

    try {
      if (!'/contacts'.includes('{') || createdIds['contacts']) {
        const rescreateContact = await app.inject({
          method: 'POST',
          url: `/contacts`,
          headers: asAuth(testUserId),
          payload: {
            name: 'test_string',
          },
        })
        if (rescreateContact.statusCode === 201 && rescreateContact.json().data?.id)
          createdIds['contacts'] = rescreateContact.json().data.id
        if (rescreateContact.statusCode !== 201) {
          console.error(
            'createContact failed with ' + rescreateContact.statusCode,
            rescreateContact.json().message || rescreateContact.json(),
          )
        }
        expect(rescreateContact.statusCode).toBe(201)
        await validateResponse('createContact', 201, rescreateContact.json())
      }
    } catch (e: any) {
      errors.push(new Error('createContact failed: ' + e.message))
    }

    // importContacts

    // importContacts - auth check
    try {
      if (!'/contacts/import'.includes('{') || createdIds['contacts-import']) {
        const resimportContactsAuth = await app.inject({ method: 'POST', url: `/contacts/import` })
        expect(resimportContactsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('importContacts auth failed: ' + e.message))
    }

    try {
      if (!'/contacts/import'.includes('{') || createdIds['contacts-import']) {
        const resimportContacts = await app.inject({
          method: 'POST',
          url: `/contacts/import`,
          headers: asAuth(testUserId),
          payload: {
            contacts: [
              {
                name: 'test_string',
              },
            ],
          },
        })
        if (resimportContacts.statusCode === 201 && resimportContacts.json().data?.id)
          createdIds['contacts-import'] = resimportContacts.json().data.id
        if (resimportContacts.statusCode !== 200) {
          console.error(
            'importContacts failed with ' + resimportContacts.statusCode,
            resimportContacts.json().message || resimportContacts.json(),
          )
        }
        expect(resimportContacts.statusCode).toBe(200)
        await validateResponse('importContacts', 200, resimportContacts.json())
      }
    } catch (e: any) {
      errors.push(new Error('importContacts failed: ' + e.message))
    }

    // listContacts

    // listContacts - auth check
    try {
      if (!'/contacts'.includes('{') || createdIds['contacts']) {
        const reslistContactsAuth = await app.inject({ method: 'GET', url: `/contacts` })
        expect(reslistContactsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listContacts auth failed: ' + e.message))
    }

    try {
      if (!'/contacts'.includes('{') || createdIds['contacts']) {
        const reslistContacts = await app.inject({
          method: 'GET',
          url: `/contacts`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistContacts.statusCode !== 200) {
          console.error(
            'listContacts failed with ' + reslistContacts.statusCode,
            reslistContacts.json().message || reslistContacts.json(),
          )
        }
        expect(reslistContacts.statusCode).toBe(200)
        await validateResponse('listContacts', 200, reslistContacts.json())
      }
    } catch (e: any) {
      errors.push(new Error('listContacts failed: ' + e.message))
    }

    // getContact

    // getContact - auth check
    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resgetContactAuth = await app.inject({
          method: 'GET',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetContactAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getContact auth failed: ' + e.message))
    }

    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resgetContact = await app.inject({
          method: 'GET',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetContact.statusCode !== 200) {
          console.error(
            'getContact failed with ' + resgetContact.statusCode,
            resgetContact.json().message || resgetContact.json(),
          )
        }
        expect(resgetContact.statusCode).toBe(200)
        await validateResponse('getContact', 200, resgetContact.json())
      }
    } catch (e: any) {
      errors.push(new Error('getContact failed: ' + e.message))
    }

    // listContactInteractions

    // listContactInteractions - auth check
    try {
      if (!'/contacts/{contactId}/interactions'.includes('{') || createdIds['contacts']) {
        const reslistContactInteractionsAuth = await app.inject({
          method: 'GET',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}/interactions`,
        })
        expect(reslistContactInteractionsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listContactInteractions auth failed: ' + e.message))
    }

    try {
      if (!'/contacts/{contactId}/interactions'.includes('{') || createdIds['contacts']) {
        const reslistContactInteractions = await app.inject({
          method: 'GET',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}/interactions`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistContactInteractions.statusCode !== 200) {
          console.error(
            'listContactInteractions failed with ' + reslistContactInteractions.statusCode,
            reslistContactInteractions.json().message || reslistContactInteractions.json(),
          )
        }
        expect(reslistContactInteractions.statusCode).toBe(200)
        await validateResponse('listContactInteractions', 200, reslistContactInteractions.json())
      }
    } catch (e: any) {
      errors.push(new Error('listContactInteractions failed: ' + e.message))
    }

    // updateContact

    // updateContact - auth check
    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resupdateContactAuth = await app.inject({
          method: 'PATCH',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateContactAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateContact auth failed: ' + e.message))
    }

    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resupdateContact = await app.inject({
          method: 'PATCH',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateContact.statusCode !== 200) {
          console.error(
            'updateContact failed with ' + resupdateContact.statusCode,
            resupdateContact.json().message || resupdateContact.json(),
          )
        }
        expect(resupdateContact.statusCode).toBe(200)
        await validateResponse('updateContact', 200, resupdateContact.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateContact failed: ' + e.message))
    }

    // deleteContact

    // deleteContact - auth check
    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resdeleteContactAuth = await app.inject({
          method: 'DELETE',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteContactAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteContact auth failed: ' + e.message))
    }

    try {
      if (!'/contacts/{contactId}'.includes('{') || createdIds['contacts']) {
        const resdeleteContact = await app.inject({
          method: 'DELETE',
          url: `/contacts/${createdIds['contacts'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteContact.statusCode !== 200) {
          console.error(
            'deleteContact failed with ' + resdeleteContact.statusCode,
            resdeleteContact.json().message || resdeleteContact.json(),
          )
        }
        expect(resdeleteContact.statusCode).toBe(200)
        await validateResponse('deleteContact', 200, resdeleteContact.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteContact failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
