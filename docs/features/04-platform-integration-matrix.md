# Platform Integration Matrix

LOOPIE owns Campaign, Creative, Deployment, and attribution. Each advertiser network is a **connector** that translates those concepts. First-party `LOOPIE` inventory is `AdUnit` / `apps/ad-server` — not a connector.

## Onboarding checklist (every new advertiser)

Do these in order. UI and API must branch on `capabilities()`, never `if (platform === 'META')`.

1. Add a **capability row** to the table below (`oauth`, `mappingFields`, `pushDraft`, `pullSpend`, `activate`).
2. Implement `AdPlatformConnector` in `apps/server/src/lib/platforms/{id}/`.
3. Register it in `apps/server/src/lib/platforms/registry.ts`. Unregistered platforms stay as `PENDING` Deployment rows (the book) and return **501** on connect/push.
4. Add vendor env vars to `.env.example` only. Unset env → **503**, same as Stripe.
5. Tests mock vendor HTTP. No live network in CI.
6. Dev-mode app + testers is enough until the vendor grants production/Advanced Access.

## Capability table

| Platform | Registered   | oauth | mappingFields                   | pushDraft         | pullSpend | activate |
| -------- | ------------ | ----- | ------------------------------- | ----------------- | --------- | -------- |
| META     | yes          | yes   | adAccount, page, defaultCountry | yes (PAUSED only) | no        | no       |
| GOOGLE   | no           | —     | —                               | —                 | —         | —        |
| TIKTOK   | no           | —     | —                               | —                 | —         | —        |
| LOOPIE   | n/a (AdUnit) | —     | —                               | —                 | —         | —        |

`defaultCountry` is **not** a targeting product. Platforms that require geo to create an ad set use it as a placeholder (Meta: `US`) so a PAUSED draft can exist. Live geo/bid/audience stays in Ads Manager.

`pushDraft` never sends vendor status `ACTIVE`. LOOPIE `Deployment.status` stays `PENDING`. The destination is always `GET /r/{deploymentId}`.

## First-use flow

Campaign → Platforms → Connect {platform} → map the fields in `mappingFields` → Push draft on the Deployment.

Integrations do not get a top-level nav item. After OAuth, return to the campaign.

## Deployment

A Deployment links one internal creative to one external ad-platform object: `externalCampaignId`, `externalAdSetId`, `externalAdId`. Push is idempotent — a second call does not create another ad.

## Connector responsibilities (capability flags)

- account connection (`oauth`)
- mapping (ad account, Page, …)
- creative upload / draft campaign (`pushDraft`)
- budget/status changes (`activate` — not shipped)
- performance sync (`pullSpend` — not shipped)
- conversion upload — not shipped

## Principle

Platform-specific complexity stays inside connectors. The user works with one normalized campaign model.
