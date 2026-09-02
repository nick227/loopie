# Social Platform Architecture Proposal

## Architectural Goal

Build River as the first implementation of a generalized social publishing and engagement platform.

The architecture must support both:

- native River distribution
- authenticated third-party social providers

without creating separate content, analytics, or CRM systems for each destination.

---

## 1. Core Domain Model

### SocialPost

Represents the canonical content authored in LOOPIE.

Suggested fields:

```ts
SocialPost {
  id
  businessId
  authorUserId
  status            // DRAFT | PUBLISHED | ARCHIVED
  body
  mediaSnapshotJson?
  sourceAdvertisementVersionId?
  campaignId?
  createdAt
  updatedAt
  publishedAt?
}
```

A post can originate from:

- newly authored social content
- a PublishedAdvertisementVersion
- later: event, webinar, page, product, case study

### SocialDistribution

Represents one post sent to one provider/platform.

```ts
SocialDistribution {
  id
  socialPostId
  channel           // SOCIAL
  providerKey       // LOOPIE_RIVER, LINKEDIN, INSTAGRAM, ...
  externalPostId?
  status            // PENDING | PUBLISHED | FAILED | REMOVED
  publishedAt?
  failureCode?
  failureMessage?
  providerMetadataJson?
}
```

One canonical SocialPost can therefore have many distributions.

### RiverPost

River can either use SocialDistribution directly or maintain a thin River-specific projection for feed/ranking performance.

Preferred v1 approach:

- SocialPost = canonical authored content
- SocialDistribution(provider=`LOOPIE_RIVER`) = native publication
- River feed query uses these distributions plus normalized denormalized fields if necessary

Avoid inventing an unrelated River-only content entity unless feed performance later demands a projection table.

---

## 2. Channel and Provider Alignment

Use the CRM/social taxonomy already being introduced:

```text
Channel: SOCIAL
Provider: LOOPIE_RIVER
```

External examples:

```text
SOCIAL / LINKEDIN
SOCIAL / INSTAGRAM
SOCIAL / FACEBOOK
SOCIAL / X
SOCIAL / TIKTOK
```

Paid promotion remains distinct:

```text
PAID_ADS / META_ADS
PAID_ADS / GOOGLE_ADS
```

This allows LOOPIE to compare:

- River vs LinkedIn organic engagement
- social vs email
- organic social vs paid ads
- provider-level outcomes within Social

---

## 3. Publishing Adapter Interface

Define a shared adapter contract early.

```ts
interface SocialPublisher {
  providerKey: string

  validateConnection(businessId: string): Promise<ConnectionState>

  publish(input: NormalizedSocialPost): Promise<PublishResult>

  remove?(externalPostId: string): Promise<void>

  refreshMetrics?(externalPostId: string): Promise<ProviderMetrics>
}
```

Implementations:

- `RiverPublisher`
- `LinkedInPublisher`
- `InstagramPublisher`
- etc.

River should go through this abstraction even though it is internal. That is the architectural proof.

---

## 4. Immutable Content Boundaries

When an Advertisement is posted to River:

- reference the immutable `PublishedAdvertisementVersion`
- copy any required display-safe content into the SocialPost snapshot
- do not render directly from mutable Advertisement fields

A River post should remain historically stable even if the advertisement draft later changes.

A deliberate "Update post from latest published version" action can be added later if desired.

---

## 5. Engagement Event Model

Normalize provider events before analytics or CRM projection.

Suggested normalized event types:

```text
IMPRESSION
VIEW
PROFILE_VIEW
REACTION
COMMENT
REPLY
CLICK
FOLLOW
UNFOLLOW
SHARE
FORM_SUBMISSION
CONVERSION
```

Suggested event envelope:

```ts
SocialEngagementEvent {
  id
  businessId
  socialPostId
  distributionId
  channel
  providerId/providerKey
  type
  actorBusinessId?
  actorContactId?
  anonymousVisitorId?
  occurredAt
  providerEventId?
  metadataJson?
}
```

Requirements:

- provider event idempotency
- clear anonymous vs identified behavior
- immutable raw event ingestion where useful
- normalized projection for analytics

---

## 6. CRM Projection

Meaningful identifiable social engagement should project into the existing CRM Interaction/Activity system.

Examples:

```ts
Interaction {
  type: AD_CLICK
  channel: SOCIAL
  provider: LOOPIE_RIVER
  contactId
  leadId?
}
```

or future types such as:

```text
SOCIAL_REACTION
SOCIAL_REPLY
SOCIAL_FOLLOW
```

Do not push every anonymous impression into CRM rows. Aggregate high-volume anonymous events separately.

Recommended rule:

- aggregate anonymous exposure
- create CRM activity for identified or operationally meaningful events

---

## 7. Analytics Layers

### Post analytics

- impressions
- viewers
- reactions
- clicks
- replies
- follows
- conversions

### Provider analytics

- River vs LinkedIn vs Instagram
- engagement rate
- click rate
- lead rate
- conversion/win association

### Campaign analytics

Attach SocialPost and SocialDistribution to existing/future Campaign + Variant models.

This prepares A/B tests without requiring River-specific experiment infrastructure.

---

## 8. Public Business Identity

River requires durable public business identity.

Recommended public identifiers:

```text
/business/{publicSlug}
/business/{publicSlug}/posts/{postId-or-slug}
```

Do not expose internal numeric/database IDs as primary URLs.

Business profile data should use explicitly public-safe fields. Avoid exposing private CRM/contact/business configuration accidentally through shared DTOs.

---

## 9. Feed Query / Ranking

MVP ranking can remain simple.

Potential score inputs:

- followed business boost
- freshness
- category/industry relevance
- geographic relevance
- relationship relevance
- engagement velocity
- featured/admin boost

Start with an explainable deterministic score.

Store feed impression events so ranking changes can later be evaluated experimentally.

---

## 10. Security and Abuse Boundaries

Required:

- authenticated publishing
- business ownership checks
- rate limits
- content size limits
- safe media handling
- output encoding/sanitization
- report/takedown paths
- idempotency on publishing and provider webhooks
- provider token encryption
- tenant isolation

External-provider callbacks should never be trusted solely on payload identity; verify signatures where providers support them.

---

## 11. Architectural Principle

River should be the **reference provider**, not a special-case feature.

If River publishing, analytics, engagement, and CRM projection cannot be expressed through the same interfaces planned for external platforms, the abstraction is incomplete.
