import { describe, it, expect } from 'vitest'
import { buildCampaignAds, summarizePlacementStatus } from './buildCampaignAds'

describe('buildCampaignAds', () => {
  it('groups strictly by creativeId and never emits one row per placement', () => {
    const ads = buildCampaignAds(
      [
        {
          id: 'unit-1',
          creativeId: 'ad-1',
          status: 'DRAFT',
          impressions: 10,
          clicks: 1,
          format: 'DISPLAY_BANNER',
        },
      ],
      [
        {
          id: 'dep-1',
          creativeId: 'ad-1',
          platform: 'META',
          status: 'ACTIVE',
          impressions: 100,
          clicks: 8,
        },
        {
          id: 'dep-2',
          creativeId: 'ad-1',
          platform: 'GOOGLE',
          status: 'PAUSED',
          impressions: 20,
          clicks: 2,
        },
      ],
      new Map([['ad-1', 'Hero']]),
    )

    expect(ads[0]).toMatchObject({
      id: 'ad-1',
      channels: ['Meta', 'Google', 'LOOPIE'],
      impressions: 130,
      clicks: 11,
      status: 'ACTIVE',
      canActivate: true,
    })
  })
})

describe('summarizePlacementStatus', () => {
  it('prefers Active, then Draft LOOPIE, then Paused, then Inactive', () => {
    expect(summarizePlacementStatus([{ platform: 'META', status: 'ACTIVE' }])).toBe('ACTIVE')
    expect(summarizePlacementStatus([{ platform: 'LOOPIE', status: 'DRAFT' }])).toBe('DRAFT')
    expect(summarizePlacementStatus([{ platform: 'META', status: 'PAUSED' }])).toBe('PAUSED')
    expect(summarizePlacementStatus([{ platform: 'META', status: 'PENDING' }])).toBe('INACTIVE')
  })
})
