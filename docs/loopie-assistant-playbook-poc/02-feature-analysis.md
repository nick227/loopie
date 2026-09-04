# Loopie Integrated Assistant Playbook System — Feature Analysis

## 1. Why this feature

Loopie already has useful operating surfaces: Calendar, Pages, Advertising, CRM, Messaging, and business identity. The opportunity is not another ideas list or generic chatbot. It is a layer that turns business intent and live product state into the next useful work.

The proposed system does this with deterministic playbooks.

## 2. Product thesis

**Loopie learns the business once, turns goals into scheduled work, observes results, and changes the plan.**

The four phases are an internal operating model:

`Learn → Act → Review → Grow → Act ...`

Users do not need a long explanation of the model. The Assistant should demonstrate it through short choices and relevant reactions.

## 3. Why deterministic first

Most of the POC does not require AI:

- business classification;
- multiple-choice discovery;
- known-fact reuse;
- playbook selection;
- prerequisites;
- Calendar scheduling;
- Page/Ad/CRM state checks;
- event signals;
- review classifications;
- phase transitions.

This provides predictable behavior, low cost, testability, and clear product semantics. AI can later fill narrow judgment/creative gaps without becoming the authority for business state or mutations.

## 4. The key assets

The feature creates four reusable product assets:

### Business knowledge

Structured facts learned once and reused across Loopie.

### Business taxonomy

An expandable tree that can classify a very large range of ventures without overwhelming the user.

### Playbook library

Isolated business-strategy content describing useful sequences of work.

### Signal/rule library

Deterministic interpretations of product events and state.

Together these are more valuable than a chat transcript.

## 5. Taxonomy design

### Four-level interaction model

The practical interview is:

1. **Venture family** — broad recognizable category.
2. **Business group** — narrower operating type.
3. **Specific venture** — roofing, web development, personal training, food truck, etc.
4. **Goal/work concept** — what the user wants to accomplish.

This is not necessarily four database tables. It is a navigation hierarchy over declarative taxonomy nodes.

### Initial venture families

- Local Services
- Professional Services
- Food & Hospitality
- Retail & Ecommerce
- Health & Wellness
- Creator & Media
- Education & Coaching
- Tech & Digital
- Events & Experiences
- Other

### Example branches

```text
Local Services
├─ Home Services
│  ├─ Roofing
│  ├─ Plumbing
│  ├─ HVAC
│  ├─ Electrical
│  ├─ Painting
│  └─ Handyman
├─ Property & Outdoor
│  ├─ Lawn Mowing
│  ├─ Landscaping
│  ├─ Tree Service
│  ├─ Pressure Washing
│  └─ Pool Service
├─ Automotive
│  ├─ Auto Detailing
│  ├─ Mobile Mechanic
│  └─ Auto Repair
└─ Creative & Event Services
   ├─ Photography
   ├─ Videography
   └─ Event Services

Professional Services
├─ Digital Services
│  ├─ Web Development
│  ├─ Software Consulting
│  ├─ AI Consulting
│  ├─ Marketing Agency
│  └─ Design Studio
├─ Business Services
│  ├─ Business Consulting
│  ├─ Recruiting
│  └─ Virtual Assistance
├─ Financial Services
│  ├─ Accounting
│  └─ Bookkeeping
└─ Property & Transactions
   ├─ Real Estate
   └─ Insurance

Food & Hospitality
├─ Fixed Location
│  ├─ Restaurant
│  ├─ Coffee Shop
│  └─ Bakery
├─ Mobile Food
│  ├─ Food Truck
│  ├─ Food Trailer
│  └─ Pop-up Restaurant
└─ Food Services
   ├─ Catering
   ├─ Meal Prep
   └─ Private Chef

Health & Wellness
├─ Fitness
│  ├─ Personal Trainer
│  ├─ Fitness Studio
│  └─ Yoga Instructor
└─ Wellness Services
   ├─ Massage Therapy
   ├─ Nutrition Coaching
   └─ Wellness Coaching

Creator & Media
├─ Publishing
│  ├─ Independent Author
│  ├─ Self-Publishing
│  ├─ Publishing Agency
│  ├─ Magazine
│  └─ Newsletter
├─ Audience Media
│  ├─ YouTube Creator
│  ├─ Podcaster
│  └─ Creator Business
└─ Creative Work
   ├─ Musician
   ├─ Artist
   ├─ Photographer
   └─ Videographer

Retail & Ecommerce
├─ Physical Products
│  ├─ Apparel
│  ├─ Handmade Goods
│  ├─ Beauty Products
│  └─ Food Products
├─ Digital Products
└─ Subscription Products

Education & Coaching
├─ Tutoring
├─ Online Courses
├─ Coaching
├─ Workshops
└─ Training Company

Tech & Digital
├─ SaaS
├─ App/Product Launch
├─ Digital Product
└─ Technology Startup

Events & Experiences
├─ Event Planning
├─ Wedding Services
├─ Conference
├─ Workshop
├─ Community Event
└─ Venue
```

### Traits as cross-cutting metadata

Specific ventures should carry reusable traits:

- `LOCAL`
- `ONLINE`
- `HIGH_TICKET`
- `LOW_TICKET`
- `QUOTE_BASED`
- `APPOINTMENT_BASED`
- `PROJECT_BASED`
- `RECURRING_REVENUE`
- `SUBSCRIPTION`
- `FOOT_TRAFFIC`
- `RETAIL`
- `AUDIENCE_DRIVEN`
- `EVENT_DRIVEN`

Traits allow playbooks to be reusable without copying one for every industry.

Example:

```ts
{
  key: 'ROOFING',
  label: 'Roofing',
  traits: ['LOCAL', 'HIGH_TICKET', 'QUOTE_BASED', 'PROJECT_BASED']
}
```

Web development can share `HIGH_TICKET`, `QUOTE_BASED`, and `PROJECT_BASED` while receiving different vertical-specific steps where necessary.

## 6. Goal taxonomy

Keep the first goal choice concrete:

- Get more customers
- Make more sales
- Promote my business
- Launch something
- Improve my website
- Follow up with leads

Do not put a vague question above these buttons if the heading `Choose a goal` is enough.

Goals can narrow further only when needed.

Example:

```text
Get more customers
├─ Local promotion
├─ Referrals
├─ Outreach
├─ Advertising
└─ Not sure
```

The user does not need to know internal concepts such as `CUSTOMER_ACQUISITION`.

## 7. Business knowledge model

Taxonomy answers and playbook qualification answers should populate reusable facts.

Suggested conceptual structure:

```ts
type BusinessKnowledge = {
  ventureFamily?: string
  businessGroup?: string
  ventureType?: string
  traits?: string[]

  primaryGoal?: string
  targetCustomer?: string
  primaryOffer?: string
  serviceArea?: string
  priceBand?: string
  marketingBudgetBand?: string
  weeklyGrowthTimeBand?: string
  customerGoalBand?: string
  acquisitionChannel?: string
  differentiator?: string
}
```

Do not duplicate existing `Business` fields. Resolve/read canonical profile fields first.

A question should be able to declare the knowledge key it satisfies:

```ts
{
  key: 'weekly_growth_time',
  heading: 'Time each week',
  options: [
    { value: 'UNDER_2', label: 'Under 2 hours' },
    { value: 'TWO_TO_FIVE', label: '2–5 hours' },
    { value: 'FIVE_PLUS', label: '5+ hours' }
  ],
  writesKnowledge: 'weeklyGrowthTimeBand'
}
```

## 8. Playbook selection

A playbook can declare applicability through a combination of:

- goal;
- venture family/group/type;
- traits;
- known constraints;
- current Loopie state.

Specificity can determine precedence:

`exact venture + goal` > `business group + goal` > `trait + goal` > `generic goal`.

This allows the library to grow gradually.

Example:

```ts
{
  key: 'LOCAL_SERVICE_GET_CUSTOMERS',
  goals: ['GET_MORE_CUSTOMERS'],
  traits: ['LOCAL'],
  questions: [...],
  steps: [...],
  review: {...}
}
```

A later roofing-specific playbook can override or extend it without changing the engine.

## 9. Phase engine

The phase engine should be small and explainable.

Conceptually:

```ts
if (!hasEnoughKnowledgeForGoal(state)) return LEARN
if (!playbookReadyForReview(state)) return ACT
if (!reviewConclusion(state)) return REVIEW
if (!nextDirection(state)) return GROW
return ACT
```

Every transition should carry a reason for debugging/UI:

```ts
{
  phase: 'REVIEW',
  reason: 'The outreach and follow-up steps are complete.'
}
```

## 10. Reactive state model

Build a semantic Assistant snapshot from existing services rather than teaching the Assistant raw database structure.

```ts
type AssistantBusinessSnapshot = {
  knowledge: BusinessKnowledge
  pages: PageSummary[]
  ads: AdSummary[]
  crm: CrmSummary
  messaging: MessagingSummary
  sales: SalesSummary
  calendar: CalendarSummary
  recentSignals: AssistantSignal[]
}
```

The snapshot is deterministic application context, not an AI prompt requirement.

## 11. Signals

Signals should be derived from state/events and evaluated against the active goal.

Examples:

### Page traffic without conversion

Condition:

- published relevant page;
- meaningful recent views;
- no submissions/leads.

Assistant:

> **Your page is getting visits.**  
> No leads yet.
>
> **Review page**

### New sale

Condition:

- Sale created during active goal cycle.

Assistant:

> **You made a sale.**  
> Let’s see what worked.
>
> **Review results**

### Interested lead without follow-up

> **3 interested leads need follow-up.**
>
> **Add follow-ups**

### Ad traffic without result

> **Your ad is getting clicks.**  
> No leads yet.
>
> **Review campaign**

## 12. Assistant home / intrigue

Do not lead with an explanation of the system.

For a new user:

> **Tell Loopie about your business.**
>
> [ Local service ]  
> [ Professional service ]  
> [ Food & hospitality ]  
> [ Retail & ecommerce ]  
> [ Creator & media ]  
> [ More ]

For a known business, skip known classification and show concrete goals or a relevant signal.

Examples:

> **Choose a goal**
>
> [ Get more customers ]  
> [ Make more sales ]  
> [ Promote my business ]  
> [ Launch something ]  
> [ Improve my website ]  
> [ Follow up with leads ]

Or, when a system signal is stronger:

> **2 interested leads need follow-up.**
>
> **Add follow-ups**

The system should intrigue through relevance, not claims about intelligence.

## 13. POC recommendation

Implement one strong vertical path and one contrasting path.

### Path A: Roofing

```text
Local service
→ Home services
→ Roofing
→ Get more customers
→ Homeowners
→ Service area
→ Customer target
→ Weekly time
→ Marketing budget
→ Build plan
```

Potential Act plan:

1. Confirm primary offer.
2. Publish/verify homepage.
3. Build first prospect/referral list.
4. Contact a bounded number of prospects.
5. Follow up.
6. Ask completed customers for reviews/referrals.

Use existing Page state to skip the homepage step when satisfied.

### Path B: Web development

```text
Professional service
→ Digital services
→ Web development
→ Get more customers
→ Business customers
→ Project type/offer
→ Customer target
→ Weekly time
→ Build plan
```

Potential Act plan:

1. Define primary service/offer.
2. Ensure portfolio/homepage exists.
3. Build prospect list.
4. Send targeted outreach.
5. Follow up.
6. Send proposal when interest is recorded.

This branch can reuse several task templates from roofing while proving trait/vertical customization.

## 14. Suggested POC UI states

### Learn

- Assistant header with small phase/progress treatment if desired.
- One heading.
- 3–7 buttons.
- Back allowed.
- Answers persist immediately.

### Act

> **Your first plan**
>
> Get your offer online  
> Contact 10 prospects  
> Follow up with replies
>
> **Add to Calendar**

Keep the plan compact before scheduling.

### Review

> **You contacted 10 prospects.**  
> 3 are interested.
>
> **Review results**

### Grow

> **This approach produced a sale.**
>
> [ Do more of this ]  
> [ Improve the approach ]  
> [ Try another channel ]  
> [ Increase the goal ]

## 15. Integration with existing Ideas/Calendar

Do not create a second task universe.

```text
Task Templates
      ↑
Playbooks reference them
      ↓
Assistant sequences them
Ideas recommends eligible ones
Calendar schedules them
System state completes/unlocks them
```

The existing Ideas catalog can gradually be normalized into reusable task templates. There is no need to migrate all existing ideas before the POC.

## 16. Risks and controls

### Risk: taxonomy becomes enormous

Control: hierarchical choices + traits + inheritance. Add ventures as content, not code.

### Risk: assistant becomes another onboarding wizard

Control: goal cycles, system signals, Review/Grow, and reuse of known facts.

### Risk: noisy event reactions

Control: relevance/actionability/deduplication gates.

### Risk: duplicate business facts

Control: canonical knowledge keys and mappings to existing Business fields.

### Risk: playbook logic gets buried in services

Control: isolated declarative content directories.

### Risk: too much copy

Control: enforce content rules in review/tests. One idea per sentence.

### Risk: premature general engine

Control: implement only abstractions needed by two POC paths and four phases.

## 17. Success signal

The POC succeeds if a user can open Assistant, make a small number of obvious choices, see Loopie reuse what it already knows, receive a credible scheduled plan, and later see the Assistant react appropriately to a real Page/CRM/Sale/Ad event.

The desired feeling is not “I chatted with an AI.”

It is:

> **Loopie knows what I’m trying to do and keeps me moving.**
