const fs = require('fs')
const yaml = require('js-yaml')
const path = require('path')

const specPath = path.resolve(__dirname, '../packages/api-spec/openapi.yaml')
const doc = yaml.load(fs.readFileSync(specPath, 'utf8'))

// Define new paths
const newPaths = {
  '/admin/platform-affiliates': {
    get: {
      operationId: 'listPlatformAffiliates',
      summary: 'List platform affiliates',
      tags: ['admin'],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
    post: {
      operationId: 'createPlatformAffiliate',
      summary: 'Create platform affiliate',
      tags: ['admin'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        201: {
          description: 'Created',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/admin/platform-affiliates/{id}': {
    get: {
      operationId: 'getPlatformAffiliate',
      summary: 'Get platform affiliate',
      tags: ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
    patch: {
      operationId: 'updatePlatformAffiliate',
      summary: 'Update platform affiliate',
      tags: ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/admin/platform-affiliate-deals': {
    get: {
      operationId: 'listPlatformDeals',
      summary: 'List platform affiliate deals',
      tags: ['admin'],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
    post: {
      operationId: 'createPlatformDeal',
      summary: 'Create platform affiliate deal',
      tags: ['admin'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        201: {
          description: 'Created',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/admin/platform-affiliate-classes': {
    get: {
      operationId: 'listPlatformClasses',
      summary: 'List platform affiliate classes',
      tags: ['admin'],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/admin/businesses/{businessId}/platform-attribution': {
    get: {
      operationId: 'getBusinessAttribution',
      summary: 'Get business platform affiliate attribution',
      tags: ['admin'],
      parameters: [{ name: 'businessId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
    post: {
      operationId: 'setBusinessAttribution',
      summary: 'Set business platform affiliate attribution',
      tags: ['admin'],
      parameters: [{ name: 'businessId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/affiliates/me': {
    get: {
      operationId: 'getMyPlatformAffiliate',
      summary: 'Get my platform affiliate',
      tags: ['admin'],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
}

// Insert new paths
doc.paths = { ...doc.paths, ...newPaths }

// Write back
fs.writeFileSync(specPath, yaml.dump(doc, { noRefs: true, lineWidth: -1 }))
console.log('OpenAPI spec updated successfully.')
