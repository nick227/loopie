export const AD_SETUP_INTRO =
  'Name the ad, attach one creative, and check where it should appear. Save keeps it in LOOPIE. Continue reviews paid destinations before anything is sent.'

export const AD_MEDIA_HINT =
  'Desktop and Mobile only preview how the file crops. They do not change where it appears.'

export const AD_MEDIA_SENT_HINT =
  'Your changes are saved in LOOPIE. Versions already sent to a platform are unchanged.'

export const AD_DESTINATIONS_HINT = 'Check where this ad should appear. Pages are free.'

export const AD_AUCTION_NOTE = (platform: string) =>
  `${platform} will determine actual delivery and cost through its advertising auction.`

export const AD_DRAFT_NOTE =
  'LOOPIE will send this as a paused draft. No advertising spend starts from this action.'

export const AD_STOP_NOTE = (platform: string) =>
  `After activation in ${platform} Ads Manager, changes to delivery or stopping the ad must currently be made there.`

export const AD_FINANCE_NOTE =
  'Platform budget — configured on the platform. Not reserved from LOOPIE funds.'

export const AD_CHANGED_SINCE_SENT = (platform: string) =>
  `Advertisement changed since the ${platform} version was sent.`

export const AD_READY_TITLE = 'Ready to send'
export const AD_NEEDS_ATTENTION_TITLE = 'Needs attention'

// Meta is currently the only connector this app can push a draft to, and it only ever optimizes
// for link clicks — there is no real choice to offer yet. Shown so the order states its intent
// honestly rather than silently having none; becomes a real choice once a second Goal is wired to
// an actual connector mapping.
export const AD_GOAL_LABEL = 'Get Leads'
export const AD_SUCCESS_EVENT_LABEL = 'Lead created'

// Was "not sent — a note for your own reference only" before real targeting shipped. Meta now
// resolves this into an actual radius-targeted spot via its own location search (or country-only
// when left blank) — see AdRunService.updateTargeting / the Meta connector's buildTargetingSpec.
export const AD_LOCATION_SENT_NOTE = (platform: string) =>
  `${platform} resolves this into a real targeted location. Leave blank for country-only targeting.`

export const AD_COUNTRY_SOURCE_NOTE =
  "The country actually sent is this platform account's own default — set it on the Platforms page, not per order."
