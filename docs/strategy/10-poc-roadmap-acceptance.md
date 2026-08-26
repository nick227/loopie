# POC Roadmap & Acceptance Criteria

## Goal
Prove that one business can create a campaign, deploy creative, track performance, capture a lead, and attribute a later sale back to the campaign.

## Milestone 1 — Core data model
Build:
- Business
- Campaign
- Asset
- Creative
- Deployment
- Contact
- Lead
- Sale
- PerformanceSnapshot

Acceptance:
campaign → creative → deployment → lead → sale works end to end.

## Milestone 2 — Asset library
Support image, text, image+text, video, audio, and hosted creative URL.

Acceptance:
assets can be reused across campaigns.

## Milestone 3 — Campaign UX
Support create, edit, pause/resume, extend, duplicate, end.

Acceptance:
campaign can be managed without living inside platform dashboards.

## Milestone 4 — First platform integration
Prefer Meta or Google.

Acceptance:
one real external ad/deployment can be represented and refreshed.

## Milestone 5 — Attribution
Build tracked redirect, session/click persistence, and lead-form linkage.

Acceptance:
form submission traces to campaign + creative + deployment.

## Milestone 6 — CRM-lite sale
Build contact/lead view, mark sale, and revenue amount.

Acceptance:
sale updates campaign and creative performance automatically.

## Milestone 7 — Dashboard/reporting
Show Spend, Leads, CPL, Active Campaigns, funnel, creative comparison, and platform comparison.

## POC success condition
The user can answer:

**What did we run, where did we run it, what did we spend, which creative worked, and did it produce real sales?**

## Out of scope
- full CRM
- complex workflow automation
- sophisticated attribution models
- enterprise permissions
- advanced social scheduling
- many ad-platform integrations
