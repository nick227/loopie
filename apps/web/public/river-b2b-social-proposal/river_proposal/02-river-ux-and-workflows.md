# River UX and Workflow Specification

## 1. River as a First-Class Page

River should appear in primary navigation as a peer to major LOOPIE work surfaces.

Suggested route:

`/river`

Suggested page structure:

- compact River header
- create/post action
- feed filters or discovery tabs
- post stream
- optional right-side discovery rail on wide screens

Avoid making the initial experience resemble an analytics dashboard. River should primarily be a place to **see and publish business activity**.

---

## 2. Feed Structure

A River post should visibly identify:

- business avatar/logo
- business name
- timestamp
- post body/caption
- optional media
- optional embedded ad creative
- optional CTA
- engagement actions

Example:

```text
┌──────────────────────────────────────────────┐
│ [Logo] Midnight Creative       24m           │
│        Video · Software · AI                 │
│                                              │
│ We just launched a new campaign for Acme.   │
│                                              │
│ [              creative                 ]   │
│                                              │
│ View project                                 │
│                                              │
│ 42 reactions · 8 clicks                     │
│ [React] [Reply] [Share]                     │
└──────────────────────────────────────────────┘
```

The visual system can borrow subtle social conventions, but business identity and business intent should remain stronger than vanity metrics.

---

## 3. Publishing Workflow

### New organic post

`River → Create post`

Fields:

- text/caption
- media
- optional destination / CTA
- optional campaign
- destinations

Destinations initially:

- River — enabled by default
- authenticated external platforms — where configured

Later:

```text
Post to
✓ River
✓ LinkedIn
□ Instagram
□ Facebook
```

The posting UI should expose platform-specific limitations only when necessary.

### Publish an existing Advertisement

Advertisement editor:

- Save
- Publish
- Embed
- **Post / Distribute**

Distribution picker:

```text
Publish advertisement to
✓ River
□ LinkedIn
□ Facebook
□ Instagram
```

River should consume the immutable `PublishedAdvertisementVersion`, never the mutable draft.

Republishing the ad itself should not silently mutate an existing River post unless the post explicitly references a live-version alias. Prefer immutable post content for v1.

---

## 4. Public Business Profiles

Every River post links to a public business profile.

Suggested profile hierarchy:

```text
[ large logo ]  Midnight Creative
                Austin, TX · Creative Agency
                Video · Software · AI

[ Follow ] [ Website ] [ Contact ]

Posts   Ads   About
```

The profile is both identity and conversion surface.

Recommended content:

- logo/avatar
- cover or hero treatment later
- business name
- description
- industry
- location
- website
- verified/authenticated external social links
- recent River posts
- active advertisements
- events/webinars
- contact or lead form

The owner should edit this through the same always-open Business Identity surface already being developed, rather than a disconnected public-profile editor.

---

## 5. Engagement Model in the UI

Start with low-friction engagement:

- react
- follow
- click
- reply/comment
- share/repost later

Do not initially require a giant reaction taxonomy. A single lightweight reaction or a very small set is sufficient.

Publisher analytics should prioritize business outcomes:

- impressions
- unique viewers where reliable
- profile visits
- clicks
- reactions
- replies
- follows generated
- leads/forms generated

Avoid emphasizing follower counts as the primary success signal.

---

## 6. CRM Integration

When an identifiable business/contact engages, relevant actions should appear in CRM activity.

Examples:

```text
River · LOOPIE_RIVER
Post viewed
```

```text
River · LOOPIE_RIVER
Advertisement clicked
```

```text
River · LOOPIE_RIVER
Replied to post
```

These activities should participate in:

- last touch
- lead activity timeline
- channel/provider analytics
- campaign attribution
- future A/B testing

Anonymous impressions remain aggregate analytics until identity becomes legitimately available.

---

## 7. Discovery Without Network Scale

A new River cannot depend entirely on follows.

Suggested feed tabs for early versions:

- **For You** — simple relevance/ranking
- **Following** — explicit followed businesses
- **Latest** — chronological business activity

Potential early relevance signals:

- industry overlap
- geographic proximity
- business category
- existing relationship/activity
- recentness
- post engagement
- featured businesses

Keep ranking deterministic and explainable initially.

---

## 8. Moderation and Trust

MVP protections:

- report post
- hide post
- block/mute business later
- business ownership/authentication
- rate limits
- basic spam heuristics
- admin removal/takedown
- audit trail for moderation actions

Ads published into River should follow the same content rules as organic posts plus any existing advertisement rules.

---

## 9. Mobile Behavior

River should be mobile-native from the start:

- single-column feed
- media fills card width
- sticky or easily reachable create action
- profile hero collapses cleanly
- engagement actions remain thumb-friendly
- avoid desktop side rails as required navigation

Business-profile editing remains a work surface; public profile viewing remains content-first.

---

## 10. UX Principle

River should feel like:

> A living stream of businesses doing business.

Not:

> Another corporate directory with social buttons added.
