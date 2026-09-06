const fs = require('fs')
const yaml = require('js-yaml')

const openapiPath = 'packages/api-spec/openapi.yaml'
const doc = yaml.load(fs.readFileSync(openapiPath, 'utf8'))

// 1. Add /affiliates/me/overview
doc.paths['/affiliates/me/overview'] = {
  get: {
    operationId: 'getPlatformAffiliateOverview',
    summary: 'Get affiliate overview',
    tags: ['admin'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    clients: { type: 'number' },
                    activeLicenses: { type: 'number' },
                    membershipRevenueMinor: { type: 'number' },
                    pendingEarningsMinor: { type: 'number' },
                    payableEarningsMinor: { type: 'number' },
                    paidEarningsMinor: { type: 'number' },
                  },
                  required: [
                    'clients',
                    'activeLicenses',
                    'membershipRevenueMinor',
                    'pendingEarningsMinor',
                    'payableEarningsMinor',
                    'paidEarningsMinor',
                  ],
                },
              },
              required: ['data'],
            },
          },
        },
      },
    },
  },
}

// 2. Add /affiliates/me/clients
doc.paths['/affiliates/me/clients'] = {
  get: {
    operationId: 'getPlatformAffiliateClients',
    summary: 'Get affiliate clients',
    tags: ['admin'],
    parameters: [
      { $ref: '#/components/parameters/Cursor' },
      { $ref: '#/components/parameters/Limit' },
    ],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      licenseState: { type: 'string' },
                      attributedAt: { type: 'string', format: 'date-time' },
                      directRateBps: { type: 'number' },
                      membershipRevenueMinor: { type: 'number' },
                      cumulativeEarningsMinor: { type: 'number' },
                    },
                    required: [
                      'id',
                      'name',
                      'licenseState',
                      'attributedAt',
                      'directRateBps',
                      'membershipRevenueMinor',
                      'cumulativeEarningsMinor',
                    ],
                  },
                },
                nextCursor: { type: 'string', nullable: true },
              },
              required: ['data'],
            },
          },
        },
      },
    },
  },
}

// 3. Add /admin/platform-affiliate-payouts (POST)
doc.paths['/admin/platform-affiliate-payouts'] = {
  get: {
    operationId: 'adminListPlatformAffiliatePayouts',
    summary: 'List payouts',
    tags: ['admin'],
    parameters: [
      { $ref: '#/components/parameters/Cursor' },
      { $ref: '#/components/parameters/Limit' },
    ],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/PlatformAffiliatePayout' },
                },
                nextCursor: { type: 'string', nullable: true },
              },
              required: ['data'],
            },
          },
        },
      },
    },
  },
  post: {
    operationId: 'adminCreatePlatformAffiliatePayout',
    summary: 'Create payout',
    tags: ['admin'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              affiliateId: { type: 'string' },
              earningIds: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['affiliateId', 'earningIds'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: { $ref: '#/components/schemas/PlatformAffiliatePayout' },
              },
              required: ['data'],
            },
          },
        },
      },
    },
  },
}

// 4. Add /admin/platform-affiliate-payouts/{id}/settle (PATCH)
doc.paths['/admin/platform-affiliate-payouts/{id}/settle'] = {
  patch: {
    operationId: 'adminSettlePlatformAffiliatePayout',
    summary: 'Settle payout manually',
    tags: ['admin'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: { $ref: '#/components/schemas/PlatformAffiliatePayout' },
              },
              required: ['data'],
            },
          },
        },
      },
    },
  },
}

// Add schema if not exists
if (!doc.components.schemas.PlatformAffiliatePayout) {
  doc.components.schemas.PlatformAffiliatePayout = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      affiliateId: { type: 'string' },
      totalAmountMinor: { type: 'number' },
      currency: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'affiliateId', 'totalAmountMinor', 'currency', 'status', 'createdAt'],
  }
}

fs.writeFileSync(openapiPath, yaml.dump(doc, { lineWidth: -1 }))
console.log('Successfully patched openapi.yaml')
