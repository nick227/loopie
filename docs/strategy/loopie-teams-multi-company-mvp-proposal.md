# Loopie Teams / Multi-Company MVP --- Feature Proposal & Architecture Analysis

**Status:** Proposed MVP\
**Scope:** Multi-user company access, company membership, company
switching, and strict company-scoped data isolation\
**Product terminology:** "Company" in the UI; existing `Business` model
remains the technical tenant/workspace boundary.

---

## 1. Executive Summary

Loopie currently models a user as belonging to exactly one `Business`:
`User.businessId` is required, authentication returns one `businessId`,
and registration creates a new Business together with the user. The rest
of the product is already strongly business-scoped: Pages, Media, CRM
contacts, Ads, Messaging, Calendar goals, integrations, financial
records, and most other operational records belong to a `Business`.

The Teams MVP should change only the ownership relationship at the top
of this graph.

Instead of:

```text
User → Business → Resources
```

Loopie should support:

```text
User → BusinessMembership → Business → Resources
```

This allows:

- one company to have multiple users;
- one user to belong to multiple companies;
- users to switch their active company;
- the entire application to switch branding and data context together;
- existing Business-owned resources to remain structurally unchanged.

The key product rule is:

> **Loopie operates in exactly one active company context at a time.
> Changing companies changes both the visible brand and every
> company-scoped result in the application.**

The MVP should deliberately avoid nested teams, per-resource sharing,
complex permission matrices, cross-company asset libraries, and
mixed-company screens.

---

## 2. Current-State Analysis

### 2.1 Current ownership relationship

The current Prisma structure effectively has:

```text
Business
  └─ users: User[]

User
  ├─ businessId
  └─ business: Business
```

This is an important distinction: the schema already permits a Business
to have multiple Users, but each User can reference only one Business.

Therefore the current relationship is:

```text
Business 1 → many Users
User     1 → exactly one Business
```

The missing capability is **many-to-many membership**, not multi-user
Business ownership itself.

### 2.2 Registration currently reinforces one-user/one-company behavior

Registration currently:

1.  receives email, password, and business name;
2.  creates the User;
3.  creates a Business nested under that User;
4.  provisions the default page;
5.  seeds channel providers;
6.  returns a user DTO containing a single `businessId` and
    `businessName`.

Login similarly loads the User together with that single Business.

This means the strongest one-company assumption lives at the
authentication/session/context boundary.

### 2.3 Operational resources are already company-owned

This is favorable for the Teams feature.

The `Business` model already owns or relates to major Loopie resources
including:

- Contacts and CRM data
- Audiences
- Assets / Media
- Templates
- Creatives
- Messages
- Automations
- Campaigns
- Advertisements
- Leads
- Sales
- Interactions
- Landing pages
- Forms and submissions
- Ad units
- Integrations
- Imports
- River content
- Goal ideas and scheduled goals
- Financial and ledger records

This means the Teams feature should **not** move those records onto
users.

The Business should remain the tenant/isolation boundary.

---

## 3. Product Model

### 3.1 Core concepts

For MVP there are only three important concepts:

**User**\
A human identity that can sign into Loopie.

**Company / Business**\
A business workspace containing the company's brand, customers, pages,
advertising, messages, assets, goals, integrations, and other
operational data.

**Business Membership**\
The relationship granting a User access to a Business.

Conceptually:

```text
                  ┌─ Business A ─ Pages / CRM / Ads / Media / ...
User ─ Membership ┤
                  └─ Business B ─ Pages / CRM / Ads / Media / ...
```

A user can have different roles in different companies.

Example:

```text
Nick
  ├─ HatsyShirtsy       OWNER
  ├─ Midnight Creative  OWNER
  └─ Acme Consulting    MEMBER
```

### 3.2 Company is the workspace boundary

Do not introduce a separate `Workspace`, `Organization`, or `Tenant`
entity for this MVP.

The existing `Business` already acts as Loopie's tenant.

Likewise, do not introduce nested "Teams" underneath Business yet.

For MVP:

```text
Company = Business = workspace = tenant boundary
```

"Team" describes the people who have memberships in that Business.

This avoids:

```text
User → Organization → Team → Workspace → Business → Resources
```

when the product only needs:

```text
User ↔ Membership ↔ Business → Resources
```

---

## 4. Proposed Data Model

### 4.1 Replace direct ownership with membership

Introduce a membership model similar to:

```prisma
enum BusinessMemberRole {
  OWNER
  MEMBER
}

model BusinessMembership {
  id         String             @id @default(cuid())
  userId     String
  businessId String
  role       BusinessMemberRole @default(MEMBER)
  createdAt  DateTime           @default(now())

  user       User     @relation(fields: [userId], references: [id])
  business   Business @relation(fields: [businessId], references: [id])

  @@unique([userId, businessId])
  @@index([userId])
  @@index([businessId])
}
```

Eventually `User.businessId` can be removed once all callers use
membership + active company context.

### 4.2 User becomes global identity

Target model:

```prisma
model User {
  id           String
  email        String
  passwordHash String
  ...

  memberships BusinessMembership[]
  sessions    Session[]
}
```

A User should no longer "belong to" one company as an identity-level
fact.

### 4.3 Business remains unchanged as much as possible

Business continues to own operational resources:

```text
Business
  ├─ contacts
  ├─ assets
  ├─ messages
  ├─ advertisements
  ├─ landingPages
  ├─ leads
  ├─ scheduledGoals
  └─ ...
```

This is one of the most important constraints of the proposal.

The Teams migration should change **who can enter a Business**, not
**who owns Business data**.

---

## 5. Active Company Context

Membership answers:

> Which companies may this user access?

It does not answer:

> Which company is this request currently operating on?

Loopie therefore needs an **active company context**.

### 5.1 Recommended session model

Store the selected company on the authenticated Session:

```prisma
model Session {
  id               String
  userId           String
  activeBusinessId String?
  ...
}
```

The server must validate that:

```text
session.userId
    ↓
BusinessMembership exists
    ↓
membership.businessId == session.activeBusinessId
```

A client-supplied `businessId` must never independently grant access.

### 5.2 Why Session is preferable to User

`activeBusinessId` is navigation/session state, not user identity.

Putting it on Session means:

- switching companies changes the current application context;
- the User remains globally associated with all memberships;
- different sessions can theoretically operate in different companies;
- logout/session expiration naturally clears the context;
- "last active company" can later be added separately as a convenience
  preference if needed.

---

## 6. Company Switching UX

### 6.1 Management lives on the private profile page

The user has explicitly chosen to isolate company/team management and
company switching to the private profile page.

Recommended profile section:

```text
Your companies

HatsyShirtsy
Owner
[Active]

Midnight Creative
Owner
[Switch]

Acme Consulting
Member
[Switch]
```

Below the active company's entry:

```text
Team — HatsyShirtsy

Nick             Owner
Sarah            Member
Jordan           Member

[Invite member]
```

This keeps team administration out of normal working screens.

### 6.2 Active company remains visible globally

Although switching occurs in Profile, the selected company must remain
visible throughout the application.

The existing top branding is ideal for this.

When the active company changes:

```text
HatsyShirtsy
     ↓ switch
Midnight Creative
```

the header should immediately update:

- company name;
- company logo;
- other business-specific branding currently displayed by the shell.

This gives the user a persistent visual indication of which company they
are operating.

### 6.3 Branding and data context are one operation

The system should never permit:

```text
Header: HatsyShirtsy
CRM: Midnight Creative contacts
```

or:

```text
Header: Midnight Creative
Media picker: HatsyShirtsy assets
```

Company switching should behave atomically from the user's perspective:

```text
Switch company
      ↓
Set activeBusinessId
      ↓
Invalidate company-scoped application state
      ↓
Load selected Business identity/branding
      ↓
Refetch current feature
      ↓
Render only selected Business data
```

The visible brand is effectively the user's context indicator.

---

## 7. Behavior Across Loopie Pages

Loopie should operate under a simple invariant:

> **Every company-scoped screen uses the active Business and never
> combines operational records from multiple Businesses.**

Example:

```text
Active company: Midnight Creative

Calendar     → Midnight Creative goals
Pages        → Midnight Creative pages
Advertising  → Midnight Creative ads
CRM          → Midnight Creative contacts/leads
Messaging    → Midnight Creative audiences/messages
Media        → Midnight Creative assets
Automations  → Midnight Creative automations
Reports      → Midnight Creative reports
Settings     → Midnight Creative business settings
```

Switch to HatsyShirtsy:

```text
Active company: HatsyShirtsy

Calendar     → HatsyShirtsy goals
Pages        → HatsyShirtsy pages
Advertising  → HatsyShirtsy ads
CRM          → HatsyShirtsy contacts/leads
Messaging    → HatsyShirtsy audiences/messages
Media        → HatsyShirtsy assets
...
```

### 7.1 Preserve the current route when possible

If the user switches companies while on:

```text
/crm
```

they should generally remain on:

```text
/crm
```

but now see the selected company's CRM.

Likewise:

```text
/pages → switch company → /pages
```

The feature remains constant; its tenant context changes.

If a route references a resource ID that does not belong to the newly
selected company, redirect to that feature's safe root.

Example:

```text
/pages/page-company-a-123
        ↓ switch to Company B
/pages
```

Do not attempt to find a similarly named resource in Company B.

---

## 8. Asset Ownership and Cross-Company Isolation

This is a critical source of potential confusion.

### 8.1 Operational assets belong to the company, not the human who created them

Recommended rule:

> **If a user creates or uploads something while Company A is active,
> that operational resource belongs to Company A.**

Examples:

- uploaded image → Company A Media;
- landing page → Company A Pages;
- contact → Company A CRM;
- advertisement → Company A Advertising;
- message template → Company A Messaging;
- scheduled goal → Company A Calendar.

The creator may be recorded for attribution, but creation does not make
the resource personally owned.

### 8.2 User-owned data should be narrow

User-owned information should primarily be identity/preferences:

```text
User
  email
  password/authentication
  personal display name
  personal avatar
  personal notification preferences
```

Business operational data should remain:

```text
Business
  brand
  logo
  pages
  media
  contacts
  ads
  messages
  integrations
  goals
  billing
  ...
```

### 8.3 Attribution is different from ownership

Some records should retain who performed an action:

```text
businessId       → who owns it
createdByUserId  → who created it
authorUserId     → who authored it
```

For example:

```text
ContactNote
  businessId = HatsyShirtsy
  authorUserId = Sarah
```

Sarah authored the note.

HatsyShirtsy owns the note.

If Sarah loses access to HatsyShirtsy, the note remains with
HatsyShirtsy.

This distinction should be maintained consistently.

### 8.4 No cross-company "My Media" for MVP

Do not show:

```text
My uploads
  image from HatsyShirtsy
  image from Midnight Creative
  image from Acme
```

inside a company workspace.

That would undermine tenant isolation and make accidental use of another
company's property likely.

When Midnight Creative is active, MediaPicker should query Midnight
Creative assets only.

### 8.5 Future copy/share is explicit

If Loopie later wants:

- copy page to another company;
- reuse personal template;
- duplicate an asset;
- share content across businesses;

that should be an explicit operation:

```text
Copy to company...
```

It should not emerge accidentally from a global asset pool.

---

## 9. MVP Permissions

Avoid building a generalized RBAC system initially.

### OWNER

Can:

- use all normal company features;
- edit company profile;
- invite members;
- remove members;
- manage team membership;
- eventually transfer ownership;
- manage billing/company-level destructive operations.

### MEMBER

Can:

- view company operational data;
- create/edit normal operational data;
- use Pages;
- use CRM;
- use Advertising;
- use Messaging;
- use Media;
- use Calendar and normal workflows.

Cannot:

- invite/remove company members;
- change ownership;
- perform owner-only company administration.

The MVP principle is:

```text
OWNER  = normal product access + company administration
MEMBER = normal product access
```

Do not add Viewer, Editor, Marketer, Sales, Billing Admin, Page Manager,
etc. until actual usage requires them.

---

## 10. Invitations

### 10.1 Basic invitation flow

From private Profile:

```text
Team
[Invite member]
```

Owner enters:

```text
email@example.com
```

Loopie sends an invitation.

### 10.2 Existing Loopie user

If the email already belongs to a User:

```text
Invitation
    ↓ accept
BusinessMembership created
    ↓
Company appears in user's private Profile
```

### 10.3 New Loopie user

If no User exists:

```text
Invitation
    ↓
Create Loopie account
    ↓
Accept invitation
    ↓
Membership created
```

The new user may still have their own company depending on the signup
policy described below.

### 10.4 Invitation security

Invitation acceptance must be bound to:

- target Business;
- target email;
- expiration;
- single-use token/state.

The invite should never itself contain authority to operate on arbitrary
businesses.

---

## 11. Signup Behavior

Current registration creates a Business for every new User.

For MVP this can remain unchanged.

Normal signup:

```text
Create account
    ↓
Create User
    ↓
Create Business
    ↓
Create OWNER membership
```

This preserves existing onboarding behavior.

An invited user's signup may produce:

```text
User
  ├─ Their own Business — OWNER
  └─ Inviting Business  — MEMBER
```

That is acceptable and demonstrates the many-company model naturally.

A future product decision could allow invitation-specific signup to skip
personal Business creation, but that is not required to prove Teams and
introduces additional onboarding branches.

---

## 12. Migration Strategy

The migration should be incremental rather than replacing
`User.businessId` in one release.

### Phase 1 --- Add membership

Add:

- `BusinessMembership`;
- `BusinessMemberRole`;
- memberships relations.

Backfill:

```text
for each existing User:
    create BusinessMembership(
        userId = user.id,
        businessId = user.businessId,
        role = OWNER
    )
```

At this point existing behavior remains unchanged.

### Phase 2 --- Session active company

Add:

```text
Session.activeBusinessId
```

Existing sessions can initialize from the user's current `businessId`.

New sessions select:

1.  last valid active company if such preference later exists;
2.  otherwise an OWNER membership;
3.  otherwise first valid membership.

### Phase 3 --- Resolve request context through membership

Authentication should produce something conceptually like:

```ts
type AuthContext = {
  userId: string
  businessId: string
  membershipRole: 'OWNER' | 'MEMBER'
}
```

Before business-scoped services execute:

```text
session.activeBusinessId
       ↓
verify BusinessMembership
       ↓
create AuthContext
       ↓
business-scoped service
```

### Phase 4 --- Add Profile company/team UI

Add:

- list memberships;
- active company indicator;
- switch action;
- team list;
- invite action;
- remove-member action.

### Phase 5 --- Remove assumptions about User.businessId

Search the codebase for:

```text
user.businessId
req.user.businessId
session.user.businessId
```

Replace authorization/context use with resolved active Business context.

Do not remove the legacy column until all reads are migrated and tests
prove the new model.

### Phase 6 --- Remove `User.businessId`

Only after the membership model is authoritative:

- remove `User.businessId`;
- remove direct User→Business relation;
- update registration/login DTOs;
- clean legacy compatibility paths.

---

## 13. API Shape

Keep the API small and explicit.

Suggested MVP operations:

```text
GET  /me/businesses
POST /me/active-business

GET  /business/team
POST /business/invitations
DELETE /business/members/{userId}

GET  /invitations/{token}
POST /invitations/{token}/accept
```

Exact routes should follow Loopie's existing OpenAPI conventions.

### `GET /me/businesses`

Example:

```json
{
  "data": [
    {
      "id": "business_1",
      "name": "HatsyShirtsy",
      "logoUrl": "...",
      "role": "OWNER",
      "active": true
    },
    {
      "id": "business_2",
      "name": "Midnight Creative",
      "logoUrl": "...",
      "role": "MEMBER",
      "active": false
    }
  ]
}
```

### Switch company

Request:

```json
{
  "businessId": "business_2"
}
```

Server:

```text
authenticate User
    ↓
verify BusinessMembership(userId, businessId)
    ↓
update Session.activeBusinessId
    ↓
return selected Business identity
```

A missing membership returns `403`.

---

## 14. Frontend State and Query Invalidation

The frontend should have one authoritative active Business context.

Conceptually:

```ts
{
  ;(user, activeBusiness, membershipRole)
}
```

On switch:

```text
POST switch business
        ↓
update auth/business context
        ↓
clear or invalidate all business-scoped query caches
        ↓
refetch Business branding
        ↓
refetch current route data
```

### Critical cache rule

Cache keys must include or otherwise be invalidated by `businessId`.

Dangerous:

```text
['contacts']
['pages']
['assets']
```

Safer:

```text
['business', businessId, 'contacts']
['business', businessId, 'pages']
['business', businessId, 'assets']
```

Even if the server correctly scopes requests, stale client cache can
create the appearance of cross-company leakage.

Switching should therefore invalidate the entire business-scoped cache
boundary.

---

## 15. Server-Side Isolation Rules

The browser is not a security boundary.

Every business-scoped request must resolve the Business from
authenticated context.

Bad:

```ts
service.listContacts(req.query.businessId)
```

if the service trusts the supplied ID.

Preferred:

```ts
const auth = requireAuthContext(req)
// auth.businessId already validated through membership

service.listContacts(auth.businessId)
```

Where explicit Business IDs are needed, membership must be verified
before use.

### Invariant

For every company-owned entity:

```text
entity.businessId == auth.businessId
```

or access is denied/not found.

This should apply to both list and individual-resource operations.

---

## 16. Resource URLs and Deep Links

Existing resource URLs may not contain a Business ID.

That is acceptable if authorization resolves resources against active
Business.

Example:

```text
/pages/abc123
```

should effectively query:

```text
LandingPage
WHERE id = abc123
AND businessId = activeBusinessId
```

If the user belongs to the page's Business but currently has another
company active, MVP should not silently switch companies.

Safer behavior:

```text
404 / resource unavailable in current company
```

or, where useful, a controlled UI message:

```text
This page belongs to Midnight Creative.
[Switch to Midnight Creative]
```

The latter can be added after the basic switching model is stable.

---

## 17. Billing and Subscription Considerations

Billing should remain Business-owned.

A User belonging to three companies does not imply one shared
subscription.

Conceptually:

```text
User
  ├─ Company A — paid
  ├─ Company B — free
  └─ Company C — paid
```

Existing Business subscription fields support this direction.

For MVP, billing management should be OWNER-only.

Members inherit access according to the active Business's plan.

Do not make membership itself a billing system in this feature unless
seat pricing is explicitly introduced later.

---

## 18. Business Assistant / Coach Implications

Loopie's deterministic assistant should operate entirely within active
company context.

Example:

```text
Active: HatsyShirtsy
Assistant sees:
  HatsyShirtsy business profile
  HatsyShirtsy pages
  HatsyShirtsy CRM
  HatsyShirtsy goals
```

After switching:

```text
Active: Midnight Creative
Assistant sees:
  Midnight Creative state only
```

The assistant should not recommend actions based on another company
merely because the same User has membership there.

This naturally follows the broader tenant rule:

```text
active Business → site state → next action
```

---

## 19. Audit / Attribution

Teams makes attribution more valuable.

Where operationally important, records can carry:

```text
createdByUserId
updatedByUserId
authorUserId
```

without changing ownership.

This enables future UI such as:

```text
Page updated by Sarah
Contact note by Nick
Campaign created by Jordan
```

But attribution should be added only where useful; Teams MVP does not
require retrofitting creator fields onto every table.

Authorization must always use membership/business ownership rather than
attribution.

---

## 20. Company Removal and Membership Edge Cases

MVP needs a few invariants.

### Owner cannot accidentally leave the company ownerless

Do not allow the last OWNER membership to be removed.

### Removing a member

When a member is removed:

- their BusinessMembership is revoked/deleted;
- their authored company records remain;
- their personal User remains;
- their other company memberships remain;
- sessions currently active in that Business must stop being
  authorized.

At the next request, an invalid active membership should force selection
of another accessible company.

### Suspended/deleted User

Existing User-level suspension should continue to block the User
globally.

Business membership removal is different: it revokes access to one
company only.

---

## 21. What the MVP Explicitly Does Not Include

To keep this feature focused, do **not** include:

- nested Teams inside a Business;
- departments;
- custom roles;
- per-feature permissions;
- read-only/viewer roles;
- per-Page sharing;
- per-contact sharing;
- per-asset sharing;
- cross-company Media libraries;
- cross-company dashboards;
- simultaneous multi-company reporting;
- shared global CRM;
- automatic resource movement between companies;
- ownership transfer workflows beyond what is necessary to protect the
  last owner;
- seat-based billing;
- enterprise SSO;
- SCIM;
- complex audit-log UI.

These are separate product capabilities.

---

## 22. Primary UX Flows

### Flow A --- Existing owner after migration

```text
Login
  ↓
Existing Business membership found
  ↓
Business becomes active
  ↓
Application looks essentially unchanged
```

The migration should be nearly invisible to single-company users.

### Flow B --- Invite teammate

```text
Profile
  ↓
Team
  ↓
Invite member
  ↓
Enter email
  ↓
Invitation sent
  ↓
Recipient accepts
  ↓
Recipient appears as Member
```

### Flow C --- User belongs to multiple companies

```text
Profile
  ↓
Your companies
  ↓
Midnight Creative [Switch]
  ↓
Switch
  ↓
Header/logo changes
  ↓
Business-scoped caches invalidate
  ↓
Current screen reloads with Midnight Creative data
```

### Flow D --- Member uploads media

```text
Active company = Midnight Creative
  ↓
Sarah uploads image
  ↓
Asset.businessId = Midnight Creative
  ↓
Asset appears in Midnight Creative Media
```

Switch to HatsyShirtsy:

```text
Media does not contain that image
```

### Flow E --- Member removed

```text
Owner removes Sarah from Midnight Creative
  ↓
Membership revoked
  ↓
Sarah's notes/pages/actions remain company data
  ↓
Sarah can still access her other companies
  ↓
Midnight Creative disappears from her company list
```

---

## 23. Testing Strategy

The most important tests are isolation tests, not UI snapshot tests.

### Membership tests

Verify:

- owner can access Business;
- member can access Business;
- unrelated user cannot access Business;
- removed member cannot access Business;
- one User can have multiple memberships;
- duplicate membership is rejected.

### Switching tests

Verify:

- member can switch to an accessible Business;
- user cannot switch to an inaccessible Business;
- Session activeBusinessId changes;
- current branding changes;
- current feature refetches.

### Cross-company resource tests

For two Businesses A and B, create:

- Page A / Page B;
- Contact A / Contact B;
- Asset A / Asset B;
- Message A / Message B;
- Ad A / Ad B;
- Goal A / Goal B.

When A is active:

```text
A resources visible
B resources unavailable
```

When B is active:

```text
B resources visible
A resources unavailable
```

This should be tested at API/service level, not only frontend level.

### Permission tests

Verify:

```text
OWNER → invite/remove allowed
MEMBER → invite/remove forbidden
```

Normal operational mutations should work for both in MVP.

### Cache/UI tests

Switching companies should not momentarily render stale data from the
previous Business.

---

## 24. Security Review Checklist

Before release:

- Every protected Business route derives/validates active Business
  membership.
- No endpoint trusts a browser-supplied `businessId` without
  authorization.
- Individual entity reads include Business ownership checks.
- Mutations include Business ownership checks.
- Background jobs persist/receive Business context.
- Uploads are created with active `businessId`.
- Media retrieval is Business-scoped.
- Imports are Business-scoped.
- Assistant/coach queries are Business-scoped.
- Reports are Business-scoped.
- Integrations are Business-scoped.
- Financial data is Business-scoped.
- Client caches cannot display previous-company records after
  switching.
- Revoked membership invalidates access immediately on the next
  authenticated request.

---

## 25. Implementation Depth / Risk Analysis

### What is shallow

The resource model is already favorable.

Most operational records already belong to Business, so there should be
no need to rewrite the ownership of Pages, CRM, Ads, Media, Messaging,
or Calendar.

### What is moderately deep

Authentication currently assumes one `businessId`.

The meaningful migration work is concentrated in:

- User/Business relationship;
- Session;
- auth DTO/context;
- request authorization;
- business-switch endpoint;
- frontend active-company context;
- query cache invalidation;
- Profile team/company UI.

### Highest-risk area

The highest risk is not schema migration.

It is discovering code that implicitly uses:

```text
user.businessId
```

as authorization.

Every such assumption needs to become:

```text
validated active Business context
```

A repository-wide audit should happen before implementation estimates
are finalized.

### Overall assessment

**Moderate architectural change, narrow conceptual change.**

The existing Business-centric data model significantly reduces the
migration cost.

---

## 26. Recommended MVP Delivery Slices

### Slice 1 --- Membership foundation

- Add BusinessMembership.
- Backfill every existing User as OWNER of their current Business.
- Preserve existing behavior.
- Add membership authorization tests.

### Slice 2 --- Active company context

- Add Session.activeBusinessId.
- Resolve auth context through membership.
- Continue returning current Business identity.
- Audit `user.businessId` authorization assumptions.

### Slice 3 --- Multiple-company switching

- List accessible companies.
- Add switch operation.
- Add Profile "Your companies."
- Update global top branding.
- Invalidate/refetch business-scoped data.

### Slice 4 --- Team invitations

- Owner team list.
- Invite by email.
- Accept invite.
- Existing/new user handling.
- Remove member.
- Owner/member permission boundary.

### Slice 5 --- Hardening

- Cross-company isolation suite.
- Cache leakage tests.
- revoked-membership tests;
- deep-link behavior;
- background job/context audit;
- remove remaining legacy `User.businessId` dependencies.

Only after these slices are stable should the legacy direct relationship
be removed.

---

## 27. Success Criteria

The Teams MVP is successful when all of the following are true:

1.  A company can have multiple Loopie users.
2.  A User can belong to multiple companies.
3.  Existing single-company users experience no meaningful regression.
4.  Owners can invite and remove members from the private Profile.
5.  Members can use normal Loopie features.
6.  A multi-company user can switch companies from private Profile.
7.  Switching changes the global top branding immediately.
8.  Switching changes every company-scoped result throughout the
    application.
9.  Operational resources never appear across company boundaries.
10. User-created company assets remain with the company after the user
    loses access.
11. The server verifies membership independently of the frontend.
12. The implementation does not introduce unnecessary nested teams,
    custom permissions, or cross-company resource sharing.

---

## 28. Final Recommendation

Implement Teams as a **membership and active-company-context feature**,
not as a new organizational hierarchy.

The durable architecture should be:

```text
User
  │
  ├── BusinessMembership ── Business A
  │                          ├─ Pages
  │                          ├─ Media
  │                          ├─ CRM
  │                          ├─ Advertising
  │                          ├─ Messaging
  │                          └─ Calendar / other resources
  │
  └── BusinessMembership ── Business B
                             └─ its isolated resources
```

Keep the Business as the existing tenant boundary.

Keep company management and switching on the private Profile.

Keep the active company identity visible globally through Loopie's top
branding.

Treat all operational content created while a company is active as
belonging to that company.

For MVP, use only `OWNER` and `MEMBER`, with normal read/write product
access for both and team/company administration reserved for the owner.

Most importantly, make company switching a **complete context switch**:

```text
company identity + branding + data + assets + assistant state + permissions
```

all move together.

That gives Loopie a simple mental model for solo users, teams, agencies,
contractors, and users working across several businesses without turning
the product into a complicated enterprise permissions system.
