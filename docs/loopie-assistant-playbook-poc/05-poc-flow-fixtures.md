# POC Flow Fixtures

These fixtures define expected product behavior. They are useful for implementation review, unit fixtures, and Playwright scenarios.

## Fixture A — New roofing business

### Starting state

- Business name known.
- Location known: Austin.
- No venture classification.
- No active goal cycle.
- Homepage exists but is not published.
- No ads.
- No leads.
- No sales.

### Assistant sequence

**Tell Loopie about your business.**

- Local service ← select
- Professional service
- Food & hospitality
- Retail & ecommerce
- Creator & media
- More

**Local service**

- Home services ← select
- Property & outdoor
- Automotive
- Creative & event
- Other

**Home services**

- Roofing ← select
- Plumbing
- HVAC
- Painting
- Handyman
- Other

Persist:

- ventureFamily = LOCAL_SERVICES
- businessGroup = HOME_SERVICES
- ventureType = ROOFING
- traits = LOCAL, HIGH_TICKET, QUOTE_BASED, PROJECT_BASED

**Choose a goal**

- Get more customers ← select
- Make more sales
- Promote my business
- Launch something
- Improve my website
- Follow up with leads

Persist primaryGoal = GET_MORE_CUSTOMERS.

**New customers each month**

- 1–3
- 4–10 ← select
- 10+

**Time each week**

- Under 2 hours
- 2–5 hours ← select
- 5+ hours

**Monthly marketing budget**

- $0
- Under $100
- $100–500 ← select
- $500+

Any missing target-customer/service-area fact should use a short bounded choice when possible. Reuse Business.location before asking service area.

### Build plan

**Your first plan**

- Publish your homepage.
- Build a first prospect list.
- Contact 10 prospects.
- Follow up with interested leads.
- Ask customers for reviews.

**Add to Calendar**

The actual quantity may be customized from time/customer-goal bands.

### Expected phase

`ACT`

## Fixture B — Existing roofing business skips known facts

### Starting state

BusinessKnowledge already contains:

- LOCAL_SERVICES
- HOME_SERVICES
- ROOFING
- GET_MORE_CUSTOMERS
- customerGoalBand
- weeklyGrowthTimeBand
- marketingBudgetBand

Homepage is published.

### Expected behavior

Do not ask classification, goal, or qualification questions again.
Do not schedule `Publish your homepage`.
Resolve directly to the active plan/next eligible action.

## Fixture C — Page traffic triggers Review

### Starting state

- Active customer-acquisition playbook.
- Relevant homepage/lead page published.
- Recent meaningful page views.
- Zero submissions/leads for the review window.

### Assistant

**Your page is getting visits.**

No leads yet.

**Review page**

Expected phase: `REVIEW` if the playbook review threshold is satisfied.

Expected review outcome: `NOT_WORKING` or `NOT_ENOUGH_DATA` according to configured threshold.

## Fixture D — Interested leads interrupt low-priority work

### Starting state

- Active customer-acquisition playbook.
- Three CRM leads marked interested.
- No follow-up interaction/task for those leads.
- Calendar also contains generic prospecting work.

### Assistant

**3 interested leads need follow-up.**

**Add follow-ups**

Expected behavior:

- signal outranks generic prospecting suggestion;
- action uses existing Calendar/CRM integration;
- duplicate prompt suppressed after scheduling.

## Fixture E — Sale triggers result review

### Starting state

- Active goal cycle.
- Relevant work executed.
- New Sale recorded during cycle.

### Assistant

**You made a sale.**

Let's see what worked.

**Review results**

Expected phase: `REVIEW` when review conditions are satisfied.

## Fixture F — Grow after a working cycle

### Starting state

Review outcome = WORKING.

### Assistant

**This approach produced a sale.**

- Do more of this
- Improve the approach
- Try another channel
- Increase the goal

Selecting `Do more of this` should create/modify the next Act cycle without repeating known business questions.

## Fixture G — Web development proves taxonomy breadth

### Sequence

**Tell Loopie about your business.**

- Professional service

**Professional service**

- Digital services

**Digital services**

- Web development

**Choose a goal**

- Get more customers

Persist traits such as:

- ONLINE
- HIGH_TICKET
- QUOTE_BASED
- PROJECT_BASED

Playbook should emphasize:

- primary service/offer;
- portfolio/homepage;
- prospect list;
- targeted outreach;
- follow-up;
- proposal.

It should reuse generic prospect/follow-up task templates where appropriate rather than duplicating them.
