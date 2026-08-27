export type MappingField = 'adAccount' | 'page' | 'defaultCountry'

export type PlatformCapabilities = {
  oauth: boolean
  mappingFields: MappingField[]
  pushDraft: boolean
  pullSpend: boolean
  activate: boolean
}

export type PlatformAccount = { id: string; name: string }

export type PushDraftInput = {
  accessToken: string
  adAccountId: string
  pageId: string
  defaultCountry: string
  campaignName: string
  creativeName: string
  trackedUrl: string
  dailyBudgetCents: number
  image: { bytes: Buffer; filename: string; mimeType: string }
  message: string
}

export type PushDraftResult = {
  externalCampaignId: string
  externalAdSetId: string
  externalAdId: string
}

export type AdPlatformConnector = {
  platform: string
  capabilities: PlatformCapabilities
  configured: () => boolean
  authUrl: (state: string) => string
  exchangeCode: (
    code: string,
  ) => Promise<{ accessToken: string; expiresAt: Date | null; externalUserId: string }>
  listAccounts: (token: string) => Promise<PlatformAccount[]>
  listPages: (token: string) => Promise<PlatformAccount[]>
  pushDraft: (input: PushDraftInput) => Promise<PushDraftResult>
  // Optional: a human-clickable link into the platform's own ad manager for the object pushDraft
  // just created, scoped to the connected ad account.
  managerUrl?: (result: PushDraftResult, ctx: { adAccountId: string }) => string
  // Optional: a live preview link to see the ad "in the wild"
  previewUrl?: (result: PushDraftResult, ctx: { adAccountId: string }) => string
}
