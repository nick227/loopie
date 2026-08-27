import { describe, expect, it } from 'vitest'
import { parseContactImport, SAMPLE_CSV, SAMPLE_JSON, toImportPayload } from '@project/sdk'

describe('parseContactImport', () => {
  it('parses CSV headers including HubSpot aliases', () => {
    const csv = [
      'first_name,last_name,email_address,mobile_phone,jobtitle,hs_object_id,lifecycle_stage',
      'Ada,Lovelace,ada@example.com,+15550001111,Engineer,hs_99,customer',
    ].join('\n')
    const parsed = parseContactImport(csv, 'csv')
    expect(parsed.format).toBe('csv')
    expect(parsed.rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+15550001111',
      externalId: 'hs_99',
      profile: { jobTitle: 'Engineer', lifecycle_stage: 'customer' },
    })
  })

  it('parses a JSON array and the sample files', () => {
    expect(parseContactImport(SAMPLE_JSON, 'json').rows[0].email).toBe('jordan@example.com')
    expect(parseContactImport(SAMPLE_CSV, 'csv').rows[0].profile?.jobTitle).toBe('Owner')
    const wrapped = parseContactImport(
      JSON.stringify({
        contacts: [
          { firstName: 'Bo', email: 'bo@example.com', profile: { lifecycle_stage: 'customer' } },
        ],
      }),
      'json',
    )
    expect(wrapped.rows[0].name).toBe('Bo')
    expect(wrapped.rows[0].profile).toEqual({ lifecycle_stage: 'customer' })
    const payload = toImportPayload(wrapped.rows)
    expect(payload[0]).toEqual({
      name: 'Bo',
      email: 'bo@example.com',
      profile: { lifecycle_stage: 'customer' },
    })
  })
})
