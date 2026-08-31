# Platform Integration Matrix

LOOPIE owns the Campaign, Advertisement, AdRun, and attribution models. Each advertiser network is a **connector** that translates these concepts. First-party `LOOPIE` inventory is handled natively via `apps/ad-server` rather than a connector.

Hosted landing pages (`/p/{slug}`) are an owned publishing surface, not a connector: no OAuth, no external ids. Ads appear on a page through `LandingPageAdSlot` → `AdUnit`. Click destination (`destinationLandingPageId`) is a separate question from where the ad is shown.

## Onboarding checklist (every new advertiser)

Do these in order. UI and API must branch on `capabilities()`, never `if (platform === 'META')`.

1. Add a **capability row** to the table below (`oauth`, `mappingFields`, `pushDraft`, `pullSpend`, `activate`).
2. Implement `AdPlatformConnector` in `apps/server/src/lib/platforms/{id}/`.
3. Register it in `apps/server/src/lib/platforms/registry.ts`. Unregistered platforms stay as `PENDING` AdRun rows and return **501** on connect/push.
4. Add vendor env vars to `.env.example` only. Unset env → **503**, same as Stripe.
5. Tests mock vendor HTTP. No live network in CI.
6. Dev-mode app + testers is enough until the vendor grants production/Advanced Access.

## Capability table

| Platform | Registered | oauth | mappingFields                   | pushDraft         | pullSpend | activate |
| -------- | ---------- | ----- | ------------------------------- | ----------------- | --------- | -------- |
| META     | yes        | yes   | adAccount, page, defaultCountry | yes (PAUSED only) | no        | no       |
| GOOGLE   | no         | —     | —                               | —                 | —         | —        |
| TIKTOK   | no         | —     | —                               | —                 | —         | —        |
| LOOPIE   | n/a        | —     | —                               | —                 | —         | —        |

`defaultCountry` is **not** a targeting product. Platforms that require geo to create an ad set use it as a placeholder (Meta: `US`) so a PAUSED draft can exist. Live geo/bid/audience stays in Ads Manager.

`pushDraft` never sends vendor status `ACTIVE`. LOOPIE `AdRun.status` stays `PENDING`. The destination is always `GET /r/{adRunId}`. On a successful push, connectors should extract and store a `previewUrl` if the platform API supports it, so users can view the ad "in the wild."

## First-use flow

Advertisement Creation → Add Platform Run → Connect {platform} (OAuth) → map the fields in `mappingFields` → Validate Media for Run → Push draft to Platform.

Integrations do not get a top-level nav item. After OAuth, return to the Advertisement setup.

## AdRun & Platform Validation

An AdRun links a parent Advertisement to one external ad-platform object: `externalCampaignId`, `externalAdSetId`, `externalAdId`. Push is idempotent — a second call does not create another ad.

### Per-Run Validation

When an AdRun is configured, LOOPIE validates its specific platform requirements against the parent Advertisement's media pool. Different runs may use different media variants from the same parent Ad.

If no compatible media is found, the AdRun is marked as `VALIDATION_FAILED` and cannot be activated, but this does not block other valid AdRuns under the same Advertisement.

| Platform        | Validation Requirements (Examples)      |
| --------------- | --------------------------------------- |
| META (Feed)     | 1:1 or 4:5 image/video, max text length |
| META (Reels)    | 9:16 video, max duration 60s            |
| GOOGLE (Search) | Text only, Headlines max 30 chars       |
| TIKTOK          | 9:16 video, max duration 60s            |
| LOOPIE          | Any aspect ratio, image/video           |

## Connector responsibilities (capability flags)

- account connection (`oauth`)
- mapping (ad account, Page, …)
- advertisement upload / draft creation (`pushDraft`)
- returning the native `previewUrl` upon creation
- budget/status changes (`activate` — not shipped)
- performance sync (`pullSpend` — not shipped)
- conversion upload — not shipped

## Principle

Platform-specific complexity stays inside connectors. The user works with one unified Advertisement model, while the connectors interface via internal AdRuns.
