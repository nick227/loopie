# Loopie Integrated Assistant Playbook System — Requirements

## Product goal

Turn the Assistant into a deterministic business coach that learns durable facts, selects useful playbooks, schedules real work, reacts to Loopie activity, and improves the plan over time.

The POC must demonstrate the complete model without requiring AI.

## Core product model

The system operates in four phases:

1. **Learn** — understand the business, goal, and constraints.
2. **Act** — select a playbook and turn it into concrete work.
3. **Review** — react to execution and real business outcomes.
4. **Grow** — choose what to repeat, improve, expand, or change.

These phases belong to a goal cycle. Durable business knowledge survives across cycles.

## UX requirements

### Choice-first interaction

- Prefer multiple choice over free text.
- Present approximately 3–7 choices at a time.
- Narrow large taxonomies through conditional question paths.
- Never show a giant industry/business list.
- Include `Other` or `Not sure` only where useful.
- Do not ask vague questions when concrete choices can communicate the decision.
- Do not add explanatory questions above self-explanatory choices.

### Content rules

Assistant copy must follow:

> **Short heading. Concrete choices. Next step.**

Additional rules:

- One idea per sentence.
- Keep description text to one readable sentence whenever possible.
- Avoid conversational filler.
- Avoid long compound sentences.
- Avoid open prompts such as “What are you working toward next?”
- Prefer labels such as `Choose a goal`, `Get more customers`, `Build my plan`, `Review results`.
- Explain a system observation with the smallest useful amount of copy.

Examples:

Good:

> **You had 84 page views this week.**  
> No leads yet.  
> **Review this**

Avoid:

> Your homepage had 84 views this week but hasn’t generated any leads, so we should probably review how well it is converting.

## Phase 1 — Learn

### Purpose

Learn enough to classify the business, understand the current goal, choose an appropriate playbook, and create reusable business knowledge.

### Taxonomy path

Use a hierarchical taxonomy rather than a flat industry field:

1. Venture family
2. Business group/model
3. Specific venture
4. Goal/work concept

Example:

`Local Services → Home Services → Roofing → Get Customers`

### Durable knowledge

Answers should become canonical facts where appropriate. They must be reusable by:

- Business Profile
- Pages
- Advertising
- CRM
- Messaging
- Calendar
- Ideas
- future Assistant sessions

Do not duplicate the same fact separately for each feature.

Candidate facts:

- venture family
- business group
- venture type
- business traits
- primary goal
- target customer
- primary offer
- location/service area
- price range
- marketing budget band
- weekly growth time band
- customer/revenue goal
- acquisition channel
- differentiator
- preferred contact/action

Existing canonical Business fields remain canonical. New knowledge storage is for facts without an existing natural home.

### Reuse rule

Before asking any question, check whether Loopie already knows the answer.

`known fact → skip question`

Phase 1 should become shorter over time.

### Learn exit

Learn is complete when the active goal has enough information to select/customize a useful playbook. It does not require every possible business fact.

## Phase 2 — Act

### Purpose

Turn a selected playbook into realistic scheduled work.

### Requirements

- Playbooks reference reusable task templates.
- Tasks can become Calendar items.
- Steps may map to real Loopie operations.
- Existing system state can satisfy prerequisites or complete steps.
- Quantities/timing can be customized from learned constraints.
- Calendar is the primary operating surface.

Examples:

- Publish homepage.
- Contact 10 prospects.
- Follow up with interested leads.
- Ask recent customers for reviews.
- Promote a published page.

### Act exit

Each playbook defines its own review trigger. Do not advance merely because time passed.

Examples:

- meaningful steps completed;
- campaign ran long enough to observe results;
- scheduled review date reached;
- time elapsed with insufficient execution, which itself requires review.

## Phase 3 — Review

### Purpose

Compare the intended action with execution and outcomes.

### Outcome classes

Use a small deterministic vocabulary:

- `WORKING`
- `PARTIALLY_WORKING`
- `NOT_WORKING`
- `NOT_ENOUGH_DATA`
- `NOT_EXECUTED`

### System evidence

Review should use Loopie data before asking the user:

- page views
- form submissions
- ad activity/clicks/leads/spend where available
- CRM lead status/activity
- messages sent/responses where available
- sales
- Calendar completion

Only ask for facts Loopie cannot derive.

### Review exit

Review completes when the system has enough evidence to classify the cycle and present a concrete next direction.

## Phase 4 — Grow

### Purpose

Choose what to do next based on evidence.

Typical choices:

- Do more of what worked
- Improve the current approach
- Try another channel
- Increase the goal
- Work on another part of the business

The choice selects/modifies a playbook and returns the goal cycle to Act. A materially new goal may require a short Learn pass first.

## Reactive Assistant

The Assistant must be able to react to meaningful system events.

### Awareness layers

1. **Durable knowledge** — business facts and constraints.
2. **Current state** — Pages, Ads, CRM, Messaging, Calendar, Sales.
3. **Recent signals** — views, submissions, clicks, leads, sales, overdue follow-ups, completions.

### Relevance gate

Events do not automatically become prompts. Surface only when the signal is:

- relevant to an active goal/playbook;
- actionable;
- important enough;
- not a duplicate/recently dismissed equivalent.

Examples:

- `PAGE_VIEWS_WITH_NO_LEADS` → Review landing page.
- `NEW_LEAD` → Schedule follow-up.
- `SALE_RECORDED` → Review what worked.
- `INTERESTED_LEAD_NO_FOLLOWUP` → Prioritize follow-up.
- `AD_CLICKS_NO_LEADS` → Review destination/offer before increasing spend.

## Pages and Ads awareness

The Assistant must know the user’s current Pages and Ads sufficiently to make deterministic decisions.

Use semantic summaries rather than exposing raw IDs to guidance logic where possible:

```ts
{
  pages: [
    { role: 'homepage', status: 'published', views7d: 120, submissions7d: 4 },
    { role: 'lead-magnet', status: 'draft' }
  ],
  ads: [
    { purpose: 'promote-homepage', status: 'active', clicks7d: 32, leads7d: 2 }
  ]
}
```

The application can resolve semantic handles to real IDs when executing operations.

## Playbook/content architecture

Business strategy must not be buried inside services, route handlers, or React components.

Suggested structure:

```text
business-guidance/
  taxonomy/
    venture-taxonomy.ts
    goal-taxonomy.ts
    traits.ts
  questions/
    business-questions.ts
    goal-questions.ts
  task-templates/
    publish-homepage.ts
    contact-prospects.ts
    follow-up-leads.ts
  playbooks/
    local-service-get-customers.ts
    professional-service-get-customers.ts
  rules/
    review-signals.ts
```

Rule:

> **Code implements the engine. Content files define the business strategy.**

## POC scope

The POC should prove:

> Loopie can learn about a business through short conditional choices, build a useful plan, observe real Loopie activity, and move through Learn → Act → Review → Grow without AI.

Implement enough breadth to demonstrate the architecture, not an exhaustive business encyclopedia.

### Required POC path A

`Local Services → Home Services → Roofing → Get more customers`

Collect a few reusable facts such as:

- target customer
- service area
- budget band
- weekly time
- customer goal

Select a customer-acquisition playbook and show/schedule concrete tasks.

### Required POC path B

A materially different branch, such as:
`Professional Services → Digital Services → Web Development → Get more customers`

This proves the taxonomy is expandable rather than hardcoded for roofing.

### Required reactive demonstrations

At least two:

- page views with no submissions/leads;
- new lead or sale;
- interested lead without follow-up;
- active ad with clicks but no leads.

### Required phase demonstrations

- Learn asks conditional questions and skips known facts.
- Act creates or proposes Calendar work.
- Review can be entered from completion/event evidence.
- Grow presents concrete next-direction choices and starts the next cycle.

## Non-goals for POC

- AI consultant/chat completion.
- Generic workflow engine.
- Arbitrary action DSL.
- Huge industry database.
- AI-generated playbooks.
- Full analytics/attribution engine rewrite.
- Marketplace/community playbooks.
- Free-form natural-language onboarding.

## Acceptance criteria

1. No assistant screen overloads the user with a large choice list.
2. Business classification follows conditional 3–4 level paths.
3. Answers become reusable canonical knowledge.
4. Known answers are not re-asked.
5. At least two venture branches work from declarative taxonomy data.
6. A selected goal produces a real playbook and Calendar actions.
7. Phase transitions are deterministic and explainable.
8. Assistant state includes semantic Page and Ad awareness.
9. At least two real/reproducible system signals can change the Assistant’s next action.
10. Copy follows the short-heading/concrete-choice rules.
11. Playbook/taxonomy definitions are isolated from orchestration code.
12. Existing Loopie feature APIs remain the authority for mutations.
