# River Roadmap, Experiments, and Metrics

## Phase 0 — Architecture and Product Contract

Goal: establish River as a first-class destination without destabilizing existing Ads, Messaging, CRM, or public profiles.

Deliverables:

- SocialPost model
- SocialDistribution model
- provider abstraction
- `SOCIAL / LOOPIE_RIVER` provider identity
- public business profile contract
- normalized social engagement event contract
- River navigation/route shell

Exit criteria:

- one canonical post can theoretically target River plus another provider
- no River-only analytics or CRM path is required

---

## Phase 1 — Native River MVP

Goal: a business can publish and another user can discover and engage.

Deliverables:

- `/river`
- create organic post
- public business profiles
- River provider implementation
- chronological/relevance feed
- post permalink
- impressions
- clicks
- lightweight reaction
- follow business
- publisher post analytics
- report/hide basics

Exit criteria:

- newly registered business can publish with zero external integrations
- feed has useful fallback discovery even with few follows
- impression/click/reaction events are durable and queryable

---

## Phase 2 — Advertisement Distribution

Goal: make existing ad creation immediately useful as organic social content.

Deliverables:

- `Post to River` from Advertisement editor
- consume `PublishedAdvertisementVersion`
- immutable River post snapshot
- CTA/click behavior mapping
- ad-origin attribution
- River engagement shown on Advertisement analytics

Exit criteria:

- publishing to River requires no AdRun
- editing/saving an ad draft cannot silently mutate the published River post

---

## Phase 3 — CRM Engagement Projection

Goal: social activity becomes actionable sales context.

Deliverables:

- identifiable clicks/replies/follows projected to CRM
- River provider chips in Contact activity
- River activity included in last-touch and channel analytics
- attribution to Contact/Lead/Campaign when available
- high-volume anonymous impressions remain aggregate

Exit criteria:

- salesperson can open a lead and understand River-originated engagement without visiting River analytics

---

## Phase 4 — External Social Publishing

Goal: prove River's architecture generalizes beyond LOOPIE.

Start with one platform with manageable APIs and useful B2B value.

Likely candidates:

- LinkedIn
- Facebook Pages
- Instagram Business

Deliverables:

- provider authentication
- external SocialPublisher adapter
- destination picker
- publish status/failure UI
- external post IDs
- metric sync/webhooks where supported

Exit criteria:

- same SocialPost publishes to River and at least one external provider
- analytics can compare provider performance using normalized fields

---

## Phase 5 — Campaigns and A/B Testing

Goal: transform social publishing from content distribution into measurable experimentation.

Recommended entities:

```text
Campaign
Experiment
Variant
Assignment
Outcome
```

Initial experiment types:

- caption A vs caption B
- creative A vs creative B
- CTA A vs CTA B
- River vs external provider performance
- posting-time experiments later

Guardrail:

Do not claim causal superiority from ordinary observational channel data. Strong claims require controlled assignment or sufficiently rigorous experiment design.

---

## Core Metrics

### Supply / activation

- businesses with public profiles
- businesses viewing River
- businesses publishing first post
- time from signup to first River post
- advertisements posted to River

### Consumption

- feed sessions
- posts viewed per session
- business profile visits
- follow actions

### Engagement

- impressions
- reaction rate
- click-through rate
- reply/comment rate
- follow conversion

### Business outcome

- River-generated form submissions
- River-attributed Contacts
- River-attributed Leads
- leads reaching ENGAGED/QUALIFIED/WON after River activity
- revenue associated with River-originated leads

### Cross-channel

- River vs external social engagement
- River vs email/SMS/call downstream engagement
- provider-level performance within SOCIAL

---

## Early Product Experiments

### Feed utility

Compare:

- chronological feed
- followed + latest
- simple relevance score

Outcome:

- profile visits
- click-through
- follows
- meaningful engagement

### Post composition

Compare:

- plain text
- image post
- advertisement creative
- CTA post

### Business discovery

Compare recommendations by:

- industry
- geography
- existing relationship
- recent activity

---

## Key Risks

### Empty-network problem

Mitigation:

- Latest feed
- category/industry discovery
- location relevance
- featured content
- immediate ability to publish even without followers

### Spam / low-quality promotion

Mitigation:

- business identity requirement
- rate limits
- reporting
- quality/ranking signals
- avoid engagement incentives based solely on posting volume

### Architecture diverges from external social

Mitigation:

- force River through the same provider/distribution interfaces from day one

### Analytics overclaim causality

Mitigation:

- distinguish association analytics from controlled experiments
- reserve "winner" language for experiments

### CRM event explosion

Mitigation:

- aggregate anonymous impressions
- project only identified/meaningful engagement into CRM

---

## Recommended Immediate Build Order

1. SocialPost + SocialDistribution contract.
2. River provider (`LOOPIE_RIVER`).
3. `/river` feed shell and native post creation.
4. Public business profile URLs and River post listing.
5. Impression/click/reaction event ingestion.
6. Advertisement → River distribution.
7. Publisher analytics.
8. CRM projection for identified engagement.
9. First external provider adapter.
10. Campaign/variant experimentation.

---

## North-Star Product Statement

River should make LOOPIE's marketing platform useful before a user connects anything else:

> Create a business profile, publish what you are selling or doing, reach other businesses, measure the response, and work the resulting relationships in CRM — all inside LOOPIE.
