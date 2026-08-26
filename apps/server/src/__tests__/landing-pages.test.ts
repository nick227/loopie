// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('landing-pages API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listLandingPageTemplates
    
    // listLandingPageTemplates - auth check
    try {
      if (!'/landing-page-templates'.includes('{') || createdIds['landing-page-templates']) {
        const reslistLandingPageTemplatesAuth = await app.inject({ method: 'GET', url: `/landing-page-templates` })
        expect(reslistLandingPageTemplatesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPageTemplates auth failed: ' + e.message))
    }

    try {
      if (!'/landing-page-templates'.includes('{') || createdIds['landing-page-templates']) {
        const reslistLandingPageTemplates = await app.inject({
          method: 'GET',
          url: `/landing-page-templates`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistLandingPageTemplates.statusCode !== 200) {
          console.error('listLandingPageTemplates failed with ' + reslistLandingPageTemplates.statusCode, reslistLandingPageTemplates.json().message || reslistLandingPageTemplates.json())
        }
        expect(reslistLandingPageTemplates.statusCode).toBe(200)
        await validateResponse('listLandingPageTemplates', 200, reslistLandingPageTemplates.json())
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPageTemplates failed: ' + e.message))
    }

    // getLandingPageTemplate
    
    // getLandingPageTemplate - auth check
    try {
      if (!'/landing-page-templates/{templateId}'.includes('{') || createdIds['landing-page-templates']) {
        const resgetLandingPageTemplateAuth = await app.inject({ method: 'GET', url: `/landing-page-templates/${createdIds['landing-page-templates'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetLandingPageTemplateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPageTemplate auth failed: ' + e.message))
    }

    try {
      if (!'/landing-page-templates/{templateId}'.includes('{') || createdIds['landing-page-templates']) {
        const resgetLandingPageTemplate = await app.inject({
          method: 'GET',
          url: `/landing-page-templates/${createdIds['landing-page-templates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetLandingPageTemplate.statusCode !== 200) {
          console.error('getLandingPageTemplate failed with ' + resgetLandingPageTemplate.statusCode, resgetLandingPageTemplate.json().message || resgetLandingPageTemplate.json())
        }
        expect(resgetLandingPageTemplate.statusCode).toBe(200)
        await validateResponse('getLandingPageTemplate', 200, resgetLandingPageTemplate.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPageTemplate failed: ' + e.message))
    }

    // listLandingPages
    
    // listLandingPages - auth check
    try {
      if (!'/landing-pages'.includes('{') || createdIds['landing-pages']) {
        const reslistLandingPagesAuth = await app.inject({ method: 'GET', url: `/landing-pages` })
        expect(reslistLandingPagesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPages auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages'.includes('{') || createdIds['landing-pages']) {
        const reslistLandingPages = await app.inject({
          method: 'GET',
          url: `/landing-pages`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistLandingPages.statusCode !== 200) {
          console.error('listLandingPages failed with ' + reslistLandingPages.statusCode, reslistLandingPages.json().message || reslistLandingPages.json())
        }
        expect(reslistLandingPages.statusCode).toBe(200)
        await validateResponse('listLandingPages', 200, reslistLandingPages.json())
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPages failed: ' + e.message))
    }
    // Skipped createLandingPage because payload could not be generated

    // getLandingPage
    
    // getLandingPage - auth check
    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resgetLandingPageAuth = await app.inject({ method: 'GET', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetLandingPageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPage auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resgetLandingPage = await app.inject({
          method: 'GET',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetLandingPage.statusCode !== 200) {
          console.error('getLandingPage failed with ' + resgetLandingPage.statusCode, resgetLandingPage.json().message || resgetLandingPage.json())
        }
        expect(resgetLandingPage.statusCode).toBe(200)
        await validateResponse('getLandingPage', 200, resgetLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPage failed: ' + e.message))
    }

    // updateLandingPage
    
    // updateLandingPage - auth check
    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resupdateLandingPageAuth = await app.inject({ method: 'PATCH', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateLandingPageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateLandingPage auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resupdateLandingPage = await app.inject({
          method: 'PATCH',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateLandingPage.statusCode !== 200) {
          console.error('updateLandingPage failed with ' + resupdateLandingPage.statusCode, resupdateLandingPage.json().message || resupdateLandingPage.json())
        }
        expect(resupdateLandingPage.statusCode).toBe(200)
        await validateResponse('updateLandingPage', 200, resupdateLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateLandingPage failed: ' + e.message))
    }

    // deleteLandingPage
    
    // deleteLandingPage - auth check
    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resdeleteLandingPageAuth = await app.inject({ method: 'DELETE', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resdeleteLandingPageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteLandingPage auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}'.includes('{') || createdIds['landing-pages']) {
        const resdeleteLandingPage = await app.inject({
          method: 'DELETE',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteLandingPage.statusCode !== 200) {
          console.error('deleteLandingPage failed with ' + resdeleteLandingPage.statusCode, resdeleteLandingPage.json().message || resdeleteLandingPage.json())
        }
        expect(resdeleteLandingPage.statusCode).toBe(200)
        await validateResponse('deleteLandingPage', 200, resdeleteLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteLandingPage failed: ' + e.message))
    }

    // publishLandingPage
    
    // publishLandingPage - auth check
    try {
      if (!'/landing-pages/{landingPageId}/publish'.includes('{') || createdIds['landing-pages']) {
        const respublishLandingPageAuth = await app.inject({ method: 'POST', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/publish` })
        expect(respublishLandingPageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('publishLandingPage auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}/publish'.includes('{') || createdIds['landing-pages']) {
        const respublishLandingPage = await app.inject({
          method: 'POST',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/publish`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respublishLandingPage.statusCode === 201 && respublishLandingPage.json().data?.id) createdIds['landing-pages'] = respublishLandingPage.json().data.id
        if (respublishLandingPage.statusCode !== 201) {
          console.error('publishLandingPage failed with ' + respublishLandingPage.statusCode, respublishLandingPage.json().message || respublishLandingPage.json())
        }
        expect(respublishLandingPage.statusCode).toBe(201)
        await validateResponse('publishLandingPage', 201, respublishLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('publishLandingPage failed: ' + e.message))
    }

    // listLandingPageVersions
    
    // listLandingPageVersions - auth check
    try {
      if (!'/landing-pages/{landingPageId}/versions'.includes('{') || createdIds['landing-pages']) {
        const reslistLandingPageVersionsAuth = await app.inject({ method: 'GET', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/versions` })
        expect(reslistLandingPageVersionsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPageVersions auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}/versions'.includes('{') || createdIds['landing-pages']) {
        const reslistLandingPageVersions = await app.inject({
          method: 'GET',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/versions`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistLandingPageVersions.statusCode !== 200) {
          console.error('listLandingPageVersions failed with ' + reslistLandingPageVersions.statusCode, reslistLandingPageVersions.json().message || reslistLandingPageVersions.json())
        }
        expect(reslistLandingPageVersions.statusCode).toBe(200)
        await validateResponse('listLandingPageVersions', 200, reslistLandingPageVersions.json())
      }
    } catch (e: any) {
      errors.push(new Error('listLandingPageVersions failed: ' + e.message))
    }

    // exportLandingPage
    
    // exportLandingPage - auth check
    try {
      if (!'/landing-pages/{landingPageId}/export'.includes('{') || createdIds['landing-pages']) {
        const resexportLandingPageAuth = await app.inject({ method: 'GET', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/export` })
        expect(resexportLandingPageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('exportLandingPage auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}/export'.includes('{') || createdIds['landing-pages']) {
        const resexportLandingPage = await app.inject({
          method: 'GET',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/export`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resexportLandingPage.statusCode !== 200) {
          console.error('exportLandingPage failed with ' + resexportLandingPage.statusCode, resexportLandingPage.json().message || resexportLandingPage.json())
        }
        expect(resexportLandingPage.statusCode).toBe(200)
        await validateResponse('exportLandingPage', 200, resexportLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('exportLandingPage failed: ' + e.message))
    }

    // getLandingPagePerformance
    
    // getLandingPagePerformance - auth check
    try {
      if (!'/landing-pages/{landingPageId}/performance'.includes('{') || createdIds['landing-pages']) {
        const resgetLandingPagePerformanceAuth = await app.inject({ method: 'GET', url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/performance` })
        expect(resgetLandingPagePerformanceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPagePerformance auth failed: ' + e.message))
    }

    try {
      if (!'/landing-pages/{landingPageId}/performance'.includes('{') || createdIds['landing-pages']) {
        const resgetLandingPagePerformance = await app.inject({
          method: 'GET',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/performance`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetLandingPagePerformance.statusCode !== 200) {
          console.error('getLandingPagePerformance failed with ' + resgetLandingPagePerformance.statusCode, resgetLandingPagePerformance.json().message || resgetLandingPagePerformance.json())
        }
        expect(resgetLandingPagePerformance.statusCode).toBe(200)
        await validateResponse('getLandingPagePerformance', 200, resgetLandingPagePerformance.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLandingPagePerformance failed: ' + e.message))
    }

    // recordLandingPageFormStart
    
    try {
      if (!'/landing-pages/{landingPageId}/form-start'.includes('{') || createdIds['landing-pages']) {
        const resrecordLandingPageFormStart = await app.inject({
          method: 'POST',
          url: `/landing-pages/${createdIds['landing-pages'] || '00000000-0000-0000-0000-000000000001'}/form-start`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resrecordLandingPageFormStart.statusCode === 201 && resrecordLandingPageFormStart.json().data?.id) createdIds['landing-pages'] = resrecordLandingPageFormStart.json().data.id
        if (resrecordLandingPageFormStart.statusCode !== 200) {
          console.error('recordLandingPageFormStart failed with ' + resrecordLandingPageFormStart.statusCode, resrecordLandingPageFormStart.json().message || resrecordLandingPageFormStart.json())
        }
        expect(resrecordLandingPageFormStart.statusCode).toBe(200)
        await validateResponse('recordLandingPageFormStart', 200, resrecordLandingPageFormStart.json())
      }
    } catch (e: any) {
      errors.push(new Error('recordLandingPageFormStart failed: ' + e.message))
    }
    // Skipped submitLandingPageForm because payload could not be generated

    // servePublishedLandingPage
    
    try {
      if (!'/p/{slug}'.includes('{') || createdIds['p']) {
        const resservePublishedLandingPage = await app.inject({
          method: 'GET',
          url: `/p/${createdIds['p'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resservePublishedLandingPage.statusCode !== 200) {
          console.error('servePublishedLandingPage failed with ' + resservePublishedLandingPage.statusCode, resservePublishedLandingPage.json().message || resservePublishedLandingPage.json())
        }
        expect(resservePublishedLandingPage.statusCode).toBe(200)
        await validateResponse('servePublishedLandingPage', 200, resservePublishedLandingPage.json())
      }
    } catch (e: any) {
      errors.push(new Error('servePublishedLandingPage failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
