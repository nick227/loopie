import { InboxProjectionService } from '../services/InboxProjectionService'

// Honest subset of "integration failures/recovery" (2026-08-28's product direction): only the
// REAL transitions that exist in this codebase are posted — a business connecting/mapping an
// account into CONNECTED status, and an explicit disconnect. There is deliberately no automatic
// failure detection here: PlatformConnectionStatus.NEEDS_REAUTH is declared in the schema and read
// by the Home dashboard's own integration-issues widget, but nothing anywhere in this codebase
// ever computes or writes it — confirmed by search, same class of gap as the already-documented
// "no inbound-reply capture." Building a "Meta connection failed" event here would mean
// fabricating a detection mechanism that doesn't exist; that's real, separate infrastructure work
// (token-expiry checks, a failing-API-call monitor), not something to fake with this pass's
// plumbing. If/when that detection is built, it has a real home to post into already (this file,
// the INTEGRATION thread type) — it just isn't built yet.
export async function notifyIntegrationConnected(businessId: string, platform: string) {
  try {
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'INTEGRATION', integrationPlatform: platform },
      threadSubject: platform,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: `${platform} connected`,
      body: `${platform} is connected and ready.`,
    })
  } catch (err) {
    console.error('Failed to post Inbox message for integration connect', err)
  }
}

export async function notifyIntegrationDisconnected(businessId: string, platform: string) {
  try {
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'INTEGRATION', integrationPlatform: platform },
      threadSubject: platform,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: `${platform} disconnected`,
      body: `${platform} was disconnected.`,
    })
  } catch (err) {
    console.error('Failed to post Inbox message for integration disconnect', err)
  }
}
