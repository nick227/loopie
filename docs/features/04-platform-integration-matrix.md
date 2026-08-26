# Platform Integration Matrix

## Phase 1 priority
1. Meta Ads
2. Google Ads
3. TikTok Ads

Later candidates:
- LinkedIn Ads
- Microsoft Ads
- Reddit Ads
- Pinterest Ads
- Snapchat Ads
- YouTube-specific flows

## Integration appears contextually
Integrations should not require a top-level navigation page in the POC.

First-use flow:
Campaign → Platforms → Select Meta → Connect Meta

After authorization, return the user directly to campaign creation or campaign detail.

## Deployment abstraction
A Deployment links one internal creative to one external ad-platform object.

Store:
- campaignId
- creativeId
- platform
- external campaign ID
- external ad group/ad set ID
- external ad ID
- status
- spend
- impressions
- clicks
- conversions
- last sync timestamp

## Connector responsibilities
- account connection
- campaign/ad creation
- creative upload/reference
- budget/status changes
- pause/resume
- performance sync
- conversion upload where supported

## Principle
Platform-specific complexity stays inside connectors. The user works with one normalized campaign model.
