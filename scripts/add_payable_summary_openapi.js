const fs = require('fs')
const yaml = require('js-yaml')

const openapiPath = 'packages/api-spec/openapi.yaml'
const doc = yaml.load(fs.readFileSync(openapiPath, 'utf8'))

// Add /admin/platform-affiliate-earnings/payable-summary
doc.paths['/admin/platform-affiliate-earnings/payable-summary'] = {
  get: {
    operationId: 'adminGetPayableEarningsSummary',
    summary: 'Get payable earnings grouped by affiliate',
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
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      affiliateId: { type: 'string' },
                      affiliateName: { type: 'string' },
                      totalAmountMinor: { type: 'number' },
                      earningIds: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['affiliateId', 'affiliateName', 'totalAmountMinor', 'earningIds'],
                  },
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

fs.writeFileSync(openapiPath, yaml.dump(doc, { lineWidth: -1 }))
console.log('Successfully patched openapi.yaml with payable summary')
