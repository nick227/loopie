# River Product Proposal

## Executive Summary

LOOPIE should introduce **River**, a first-class B2B social feed where businesses publish updates, advertisements, offers, launches, events, case studies, and other business-facing content.

River serves two strategic purposes at the same time:

1. **Product value:** businesses receive an immediately usable social channel inside LOOPIE without needing to authenticate Facebook, LinkedIn, Instagram, X, or another third-party platform.
2. **Platform value:** LOOPIE gets a controlled environment for hardening social publishing, engagement tracking, campaign attribution, A/B testing, and CRM projection before or alongside external-platform integrations.

The first version should prioritize posting, discovery, engagement measurement, public business profiles, and CRM attribution. It should avoid trying to reproduce a full consumer social network.

---

## Product Positioning

River is a **business-to-business social stream**.

It should feel closer to a professional marketplace of active businesses than a corporate directory. Businesses can demonstrate what they are doing now, not merely maintain static listings.

Typical content:

- advertisements
- product/service launches
- project showcases
- company updates
- promotions
- hiring or collaboration notices
- events and webinars
- educational posts
- portfolio work
- case studies
- requests for vendors, partners, or expertise

The key design principle is that **content should create measurable business intent**.

---

## Primary User Jobs

### Business owner / marketer

- Publish something once and distribute it to River and supported external platforms.
- Reuse existing LOOPIE advertisements rather than recreate social content.
- See who viewed, clicked, reacted, followed, or responded.
- Turn meaningful engagement into CRM context.
- Learn which content, channels, providers, and variants perform best.

### Sales user

- Discover business engagement attached to a Contact or Lead.
- Know that a lead viewed, clicked, reacted to, or replied to a River post.
- Understand which marketing touch preceded engagement.
- Work the lead from the existing CRM queue and profile surface.

### Business audience / visitor

- Browse a live River of relevant businesses and posts.
- Open a public business profile.
- Follow or engage with a business.
- Click through to pages, ads, events, products, forms, or contact actions.

### Management

- Measure content output, engagement, response, conversion, and channel effectiveness.
- Compare River with external social channels.
- Eventually run controlled message/post experiments.

---

## Product Principles

### 1. River is a real channel

River should be modeled alongside EMAIL, SOCIAL, PAID_ADS, WEBSITE, etc., not as a special analytics exception.

Recommended identity:

- Channel: `SOCIAL`
- Provider/platform: `LOOPIE_RIVER`

This keeps analytics comparable with LinkedIn, Instagram, Facebook, and other providers.

### 2. Existing advertisements are publishable social content

An Advertisement should be publishable to River without requiring an AdRun.

The organic River post and paid AdRun remain separate distribution concepts:

- Advertisement draft
- PublishedAdvertisementVersion
- River distribution/post
- external social distribution
- AdRun / paid media distribution

### 3. Native first, external-compatible

River should use the same normalized publishing contract intended for authenticated external platforms.

Do not build a River-only posting architecture that later has to be replaced.

### 4. Engagement becomes CRM evidence

River engagement should flow into the same interaction/activity system that already supports lead status, channel effort, work queues, and insights.

### 5. The feed is useful before network scale

River cannot depend on massive social-network density on day one.

Early utility can come from:

- businesses the user follows
- relevant industries/categories
- nearby businesses
- recently active businesses
- promoted or featured posts
- businesses already interacting with the user's company
- LOOPIE-generated discovery sections

---

## First-Class Product Surfaces

### River

A top-level application destination: `/river`.

Core functions:

- feed
- post creation
- ad-to-River publishing
- reactions
- comments/replies or lightweight responses
- business discovery
- follow actions
- post analytics

### Public Business Profile

A public profile should become the durable identity behind every River post.

It should include:

- logo/avatar
- business name
- headline / industry
- location
- short description
- website / social links
- active posts
- active advertisements
- events or webinars
- optional proof/metrics later

### Publisher

One publishing surface should eventually support:

- River
- LinkedIn
- Instagram
- Facebook
- X
- other authenticated platforms

Users select destinations rather than creating separate content in separate modules.

---

## MVP Scope

### Required

- River top-level page
- public business profiles
- native business posts
- publish an existing Advertisement to River
- post detail/permalink
- impressions
- clicks
- basic reactions
- follow business
- provider/channel attribution
- CRM Interaction creation for meaningful engagement
- basic moderation/reporting controls
- post-level analytics for the publisher

### Strong second slice

- comments/replies
- event/webinar posts
- external social publishing adapters
- campaign/variant attribution
- richer ranking
- business recommendations
- saved posts

### Explicitly not required for MVP

- consumer creator network
- private messaging platform replacement
- algorithmically complex engagement ranking
- public follower-count competition
- influencer monetization
- broad user-generated personal content

---

## Success Criteria

River succeeds initially if it proves:

1. A newly registered business can publish socially without connecting anything external.
2. Existing advertisements can be distributed organically to River in a few clicks.
3. Every River impression/click/reaction can be attributed to a business, post, provider, and campaign context.
4. Meaningful River engagement can appear in CRM history.
5. The same publishing contract can support at least one external authenticated platform without redesigning River.
6. LOOPIE can compare River performance with other channels/providers using normalized analytics.
