# Loopie Assistant Playbook POC — Implementation Plan

## Objective

Extend the existing Assistant with a deterministic four-phase playbook POC:

`LEARN → ACT → REVIEW → GROW`

Use existing Loopie APIs and Calendar infrastructure. Do not introduce AI.

## 1. Inspect before implementation

Confirm current locations/names for:

- Assistant next-action resolver and DTOs;
- Business model/profile fields;
- Calendar board, idea templates, scheduling and completion;
- Pages state/read services and metrics;
- Advertising state/read services and metrics;
- CRM lead/activity state;
- Sales events/state;
- existing assistant panel UI.

Reuse these systems. Do not create parallel page/ad/calendar models.

## 2. Add isolated business-guidance content

Suggested location:

```text
apps/server/src/business-guidance/
  taxonomy/
    ventures.ts
    goals.ts
    traits.ts
  questions/
    learnQuestions.ts
  task-templates/
    index.ts
  playbooks/
    localServiceGetCustomers.ts
    webDevelopmentGetCustomers.ts
  signals/
    reviewSignals.ts
```

Exact location may follow repository conventions.

## 3. Venture taxonomy

Implement declarative expandable nodes.

Minimum POC coverage:

```text
LOCAL_SERVICES
  HOME_SERVICES
    ROOFING
    PLUMBING
    HVAC
    PAINTING
  PROPERTY_OUTDOOR
    LAWN_MOWING
    LANDSCAPING
    PRESSURE_WASHING

PROFESSIONAL_SERVICES
  DIGITAL_SERVICES
    WEB_DEVELOPMENT
    SOFTWARE_CONSULTING
    MARKETING_AGENCY
    DESIGN_STUDIO

FOOD_HOSPITALITY
  FIXED_LOCATION
    RESTAURANT
    COFFEE_SHOP
    BAKERY
  MOBILE_FOOD
    FOOD_TRUCK
    POP_UP

HEALTH_WELLNESS
  FITNESS
    PERSONAL_TRAINER
    FITNESS_STUDIO
    YOGA_INSTRUCTOR

CREATOR_MEDIA
  PUBLISHING
    SELF_PUBLISHING
    INDEPENDENT_AUTHOR
    PUBLISHING_AGENCY
  AUDIENCE_MEDIA
    YOUTUBE_CREATOR
    PODCASTER
    NEWSLETTER
```

The data structure must support adding branches without changing the resolver/UI.

Each leaf may declare traits.

## 4. Goal taxonomy

Minimum choices:

- GET_MORE_CUSTOMERS
- MAKE_MORE_SALES
- PROMOTE_BUSINESS
- LAUNCH_SOMETHING
- IMPROVE_WEBSITE
- FOLLOW_UP_LEADS

POC only needs complete playbook behavior for `GET_MORE_CUSTOMERS`; other choices may lead to existing deterministic Assistant actions or a concise “coming next” state only if product conventions allow. Prefer wiring existing useful actions where already available.

## 5. Durable business knowledge

Add the smallest persistence mechanism consistent with the existing schema.

Requirements:

- preserve existing canonical Business fields;
- store taxonomy/goal/constraint facts that lack a natural existing field;
- business-scoped;
- usable outside Assistant;
- independently queryable by future Pages/Ads/Messaging features.

Avoid storing answers only inside a chat transcript or opaque JSON conversation history.

If a JSON knowledge object is chosen for POC, use stable documented keys and isolate access behind a service so it can evolve later.

## 6. Question resolver

Implement a small deterministic resolver:

```ts
resolveLearnQuestion(snapshot, knowledge)
```

Behavior:

1. skip known facts;
2. traverse taxonomy one level at a time;
3. return at most 3–7 concrete options;
4. after venture classification, resolve goal;
5. ask only qualification questions required by the selected playbook;
6. when enough is known, return `BUILD_PLAN`.

Do not implement a generic workflow DSL.

## 7. POC playbooks

### Local service — get more customers

Applicable to `LOCAL` ventures; demonstrate with Roofing.

Qualification facts:

- target customer;
- service area if not already known;
- monthly customer target band;
- weekly growth time band;
- marketing budget band.

Steps should reuse/create task templates such as:

- DEFINE_PRIMARY_OFFER
- VERIFY_OR_PUBLISH_HOMEPAGE
- BUILD_PROSPECT_LIST
- CONTACT_PROSPECTS
- FOLLOW_UP_INTERESTED_LEADS
- ASK_FOR_REVIEWS_OR_REFERRALS

### Web development — get more customers

Applicable to Web Development / project-based professional service.

Qualification facts:

- target customer;
- primary service/project type;
- customer target;
- weekly growth time.

Steps:

- DEFINE_PRIMARY_OFFER
- VERIFY_PORTFOLIO_OR_HOMEPAGE
- BUILD_PROSPECT_LIST
- SEND_TARGETED_OUTREACH
- FOLLOW_UP_INTERESTED_LEADS
- SEND_PROPOSAL

Reuse shared task templates where possible.

## 8. Phase state

Add minimal goal-cycle state. Do not confuse it with durable BusinessKnowledge.

Conceptual fields:

```ts
type GoalCycle = {
  goal: GoalKey
  phase: 'LEARN' | 'ACT' | 'REVIEW' | 'GROW'
  playbookKey?: string
  startedAt: Date
  reviewState?: ReviewOutcome
}
```

Use the repository’s existing persistence conventions. Avoid a generic workflow-run framework.

## 9. Phase transitions

Transitions must be deterministic and return a reason.

### Learn → Act

Enough required facts exist and a playbook is selected.

### Act → Review

Playbook-specific review condition is met. This may be completion or elapsed review window. `NOT_EXECUTED` must remain a valid review outcome.

### Review → Grow

Review outcome is resolved.

### Grow → Act

User chooses a concrete next direction and the next/modified playbook is ready.

A materially different goal can route through Learn first.

## 10. Assistant business snapshot

Build a server-side semantic snapshot from existing services.

Minimum POC:

- Business/profile facts;
- relevant Pages and publication state;
- recent Page views/submissions if available;
- Ads and active/draft state;
- CRM interested/follow-up state;
- recent Sales;
- Calendar tasks/completions.

Keep raw IDs available to execution code but prefer semantic summaries in guidance logic.

## 11. Reactive signals

Implement at least two real signals from existing data.

Recommended:

### PAGE_TRAFFIC_NO_LEADS

Relevant published page has recent views but no recent submissions/leads.

### INTERESTED_LEAD_NEEDS_FOLLOWUP

Reuse/align with existing CRM Calendar rule if possible.

### SALE_RECORDED

A sale occurred during the active cycle.

### AD_CLICKS_NO_LEADS

Only implement if current metrics make this reliable without new analytics infrastructure.

Signals must pass:

- active-goal relevance;
- actionability;
- duplicate suppression.

## 12. Assistant priority

A meaningful reactive signal may interrupt the ordinary next question/action when it is more important.

Suggested precedence:

1. urgent actionable signal tied to active goal;
2. current phase next step;
3. existing cross-product deterministic action;
4. Calendar fallback.

Do not surface every event.

## 13. Frontend POC

Reuse the existing Assistant panel.

Add a renderer for choice steps:

```ts
type AssistantChoiceStep = {
  heading: string
  description?: string // one short sentence max
  choices: Array<{ label: string; value: string }>
}
```

UI rules:

- one heading;
- optional one-sentence description only when it adds value;
- 3–7 buttons/cards;
- no generic question text when heading + choices suffice;
- Back where safe;
- choice persists immediately and fetches next step;
- show loading transition without fake chat bubbles.

## 14. Suggested POC interaction

```text
Tell Loopie about your business.

[ Local service ]
[ Professional service ]
[ Food & hospitality ]
[ Retail & ecommerce ]
[ Creator & media ]
[ More ]
```

Then:

```text
Local service

[ Home services ]
[ Property & outdoor ]
[ Automotive ]
[ Creative & event ]
[ Other ]
```

Then:

```text
Home services

[ Roofing ]
[ Plumbing ]
[ HVAC ]
[ Painting ]
[ Handyman ]
[ Other ]
```

Then:

```text
Choose a goal

[ Get more customers ]
[ Make more sales ]
[ Promote my business ]
[ Launch something ]
[ Improve my website ]
[ Follow up with leads ]
```

Qualification choices continue only as needed.

Then:

```text
Your first plan

Publish or verify your homepage
Contact 10 prospects
Follow up with interested leads
Ask customers for reviews

[ Add to Calendar ]
```

## 15. Reactive UI examples

```text
Your page is getting visits.
No leads yet.

[ Review page ]
```

```text
3 interested leads need follow-up.

[ Add follow-ups ]
```

```text
You made a sale.
Let's see what worked.

[ Review results ]
```

## 16. Content enforcement

Add unit tests or fixture assertions for POC content:

- choice count <= 7;
- headings are present;
- descriptions contain at most one sentence;
- no empty choices;
- stable keys unique;
- every taxonomy non-leaf has children;
- every referenced task template exists;
- every POC playbook can resolve from a fixture business state.

Do not attempt subjective grammar linting beyond simple enforceable rules.

## 17. Tests

### Unit

- taxonomy traversal;
- known facts skip questions;
- roofing path resolves correct playbook;
- web development path resolves correct playbook;
- phase transitions;
- playbook prerequisite resolution;
- signal relevance/deduplication;
- content constraints.

### Server integration

- persist answer → next action changes;
- existing Business fact prevents duplicate question;
- existing published homepage removes homepage prerequisite;
- CRM signal changes Assistant next action;
- Sale/Page signal enters Review where appropriate;
- Calendar schedule mutation uses existing API/service.

### E2E

One complete roofing path:

1. fresh business;
2. choose taxonomy path;
3. choose goal;
4. answer qualification choices;
5. build plan;
6. add plan to Calendar;
7. simulate/seed meaningful system event;
8. reopen Assistant;
9. verify reactive Review state;
10. choose Grow direction;
11. verify next Act cycle.

Add a shorter web-development traversal test to prove the taxonomy is data-driven.

## 18. Preserve existing behavior

Do not regress:

- current Business/Profile editing;
- current Page create/publish actions;
- current Advertising actions;
- current Calendar Ideas/board behavior;
- existing CRM activity/status behavior;
- existing Assistant cross-product actions unless intentionally superseded by higher-priority playbook behavior.

## 19. Definition of done

The POC is done when:

- Assistant can classify at least two distinct ventures through conditional multiple choice;
- learned facts persist and are reusable;
- known facts are skipped;
- `GET_MORE_CUSTOMERS` selects a useful isolated playbook;
- plan creates/schedules real Calendar work;
- Assistant knows relevant Pages/Ads state;
- at least two system signals produce useful reactive behavior;
- all four phases are demonstrable;
- Grow feeds back into another Act cycle;
- content follows the short-copy rules;
- no AI dependency exists.
