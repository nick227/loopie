# LOOPIE Business Plan

## Purpose

This plan answers one question: **can we acquire and retain enough paying LOOPIE customers to make the company profitable?**

## Product

LOOPIE is a SaaS product for managing a business's online messaging across advertising, contacts, leads, and social media.

Product requirements belong in the product documents. This plan covers customers, revenue, costs, cash, and the daily work required to build the company.

## Top-level money projection

These are working projections, not actual results. They use the base assumptions in this plan: $299 per account per month, four new paying accounts per month, 2% monthly churn, $45 recurring COGS per account, $100 onboarding cost, $750 cash CAC, $10,000 monthly fixed cost, and $100,000 starting cash.

| Measure | Month 12 | Month 24 |
| --- | ---: | ---: |
| Active paying accounts | 43 | 77 |
| Ending MRR | $12,874 | $22,976 |
| Monthly operating profit/(loss) | ($2,869) | $5,799 |
| Ending cash | $7,457 | $31,471 |

### Key financial conclusions

- Approximately **53 active accounts** are required to cover company costs while continuing to add four accounts per month.
- Monthly operating profit begins around **month 16** in the base case.
- The model uses about **$96,400 before cash begins recovering**, leaving a minimum balance near $3,600.
- The assumed **$100,000 starting cash is not sufficient if LOOPIE maintains a three-month reserve**. The base case requires about $126,400 plus remaining product build cost.
- The downside scenario runs out of cash around month 10.
- The month-24 result assumes no hiring or increase in fixed cost.

## Current decision

LOOPIE is still testing its business model. The company should not scale spending or hiring yet.

The immediate job is to replace the customer, price, conversion, cost, and retention assumptions with actual results. Increase spending only if those results still support the cash and break-even projection above.

## Company milestones

| Gate | Company must accomplish | Decision unlocked |
| --- | --- | --- |
| First 30 days | Product-readiness test passes; 160 qualified prospects contacted; 16 demos targeted; 4 payments targeted | Continue the customer and price test |
| First 5 paying accounts | Collected price, activation time, onboarding cost, recurring COGS, support load, and reason for buying are known | Replace early unit-economic assumptions |
| Day 90 | Cohort activity, retention, conversion by source, measured CAC, and contribution by account are reported | Choose customer, package, and acquisition channel for the next cohort |
| 10 active accounts | Delivery is repeatable without custom work and the same core workflow is used across accounts | Begin controlled acquisition spending |
| 53 active accounts | Contribution covers modeled fixed cost, onboarding, and acquisition at the base growth rate | Base operating break-even |
| Three profitable months | Economic operating profit includes founder labor and customers remain long enough to recover CAC | Profitability POC passes |

## What must be proven

1. A specific type of customer will pay for LOOPIE.
2. Customers will activate and continue using it.
3. Subscription revenue will exceed the direct cost of serving each customer.
4. Customer acquisition cost can be recovered in an acceptable time.
5. Customer contribution can cover the full cost of the company, including founder labor.

## Current facts

- The product is named LOOPIE.
- LOOPIE's core business model is SaaS. Any onboarding or campaign-management service is priced and measured separately.
- No paying-customer count, MRR, churn, CAC, cash balance, or cost baseline is documented yet.
- Product specifications exist, but this plan does not assume every specified feature is complete.

## Product readiness

Do not take a paying account until these items work together. Enter the real status and owner now.

| Required capability | Paid-launch test | Status/owner | Due | Remaining cost |
| --- | --- | --- | --- | ---: |
| Account access | A business can sign in and its data is isolated from other accounts | TBD | TBD | TBD |
| Contacts | Import, deduplicate, search, and preserve source and channel eligibility | TBD | TBD | TBD |
| Messaging activity | Complete at least one real send or publishing path and record success/failure | TBD | TBD | TBD |
| Lead handling | Capture a response, assign an owner and next action, and update lead stage | TBD | TBD | TBD |
| Results | Connect activity to the contact and display the resulting response or outcome | TBD | TBD | TBD |
| Billing | Collect, refund, cancel, and reconcile a real subscription payment | TBD | TBD | TBD |
| Reliability | Log integration failures and restore or safely stop affected activity | TBD | TBD | TBD |
| Data controls | Back up customer data; support export/deletion; document access and consent handling | TBD | TBD | TBD |

Before the first sale, record:

- The channels and integrations that are actually live.
- Remaining engineering work, owner, due date, and cost.
- One completed acceptance run from account creation through payment and first useful result.

The cash projection must be updated when the remaining build cost is known.

Build in dependency order: account/data isolation → contacts → one complete messaging path → lead handling → results → billing → reliability and data controls. Do not spread work across additional channels until one path completes the paid-launch test.

## Working financial assumptions

These are model inputs, not facts. Update actuals every Friday. Revise the assumptions at the evidence gates below.

An **account** means one paying business workspace. This is the billable unit used throughout the model.

| Input | Plan | Actual | Why it matters |
| --- | ---: | ---: | --- |
| Monthly subscription | $299 | TBD | Revenue per account |
| Onboarding fee | $0 | TBD | Keeps the first SaaS offer simple |
| Recurring COGS per account/month | $45 | TBD | Hosting, APIs, payment fees, and normal support |
| Onboarding cost per new account | $100 | TBD | One-time setup and support labor |
| New paying customers/month | 4 | TBD | Growth rate to test |
| Monthly customer churn | 2% | TBD | Retention assumption |
| Cash CAC | $750 | TBD | Acquisition cash per new paying customer; sales salaries remain in fixed cost |
| Fixed cash operating cost/month | $10,000 | TBD | Includes an assumed founder salary plus product, tools, and administration |
| Starting cash | $100,000 | TBD | Runway assumption |

Customer ad spend is not LOOPIE revenue or expense when the customer pays the platform directly. Any campaign-management service must have its own revenue and labor margin; it must not be hidden inside SaaS margin.

The projection assumes founder salary is paid in cash. If founder pay is deferred, track a second economic P&L that still charges the replacement cost; otherwise unpaid labor will make the business look more profitable than it is.

## Pricing and packaging

Test one SaaS package first.

| Item | Launch proposal |
| --- | --- |
| Price | $299 per business workspace per month |
| Commitment | Monthly; cancel before the next billing period |
| Onboarding | $0 while onboarding remains within the modeled $100 cost |
| Product access | Contacts, leads, messaging activity, social activity, advertising activity, and results that are ready at launch |
| Usage | Written contact, user, channel, message, storage, and API limits must be added before sale |
| Excess usage | Overage charge or provider cost passed through; never leave heavy usage unlimited |
| Custom services | Quoted and measured separately from SaaS revenue and margin |

Pricing tests:

1. Offer $299 without discounting to the first qualified buyers.
2. Test $499 when the same buyer needs multiple channels, more usage, or hands-on onboarding.
3. Record offer, accepted price, discount, reason lost, usage, and support time for every account.
4. Approve the final package only after at least five collected payments and measured cost to serve.

Do not introduce a free plan, annual discount, or multiple feature tiers until activation and retention are measured.

## Daily company work

| Owner | Every weekday | Record in |
| --- | --- | --- |
| Growth | Add 8 qualified prospects, send outreach, follow up, run demos, publish or schedule one useful social item, and assign every lead a next action | LOOPIE sales pipeline |
| Customer | Onboard new accounts, review blocked users, contact at least one customer, and record activation or retention risk | LOOPIE customer log |
| Product | Check integrations and customer-visible failures; own and advance the largest activation or retention blocker | Product queue |
| Finance | Record cash collected, refunds, vendor costs, acquisition spend, and labor by activity | Finance model |
| Team | Spend 10 minutes on prospects advanced, customers activated, incidents, cash changes, and tomorrow's priority | Daily log |

Product work that does not improve acquisition, activation, retention, reliability, or cost should not displace this work during the profitability test.

## Team and ownership

Assign names before the 90-day test begins. One person may hold several roles, but every result has one owner.

| Role | Owns | Weekly result | Name |
| --- | --- | --- | --- |
| Company/Growth | Customer choice, offer, pricing, pipeline, demos, and sales | Funnel actuals and next acquisition decision | TBD |
| Product/Engineering | Product readiness, integrations, reliability, security, and instrumentation | Blockers closed and readiness status | TBD |
| Customer | Onboarding, activation, support, and retention | Activation, support load, and customer-risk report | TBD |
| Finance/Operations | Billing, cash, costs, contracts, and forecast | Actual-versus-plan financial update | TBD |

Add the real team cost to the model:

| Cost input | Monthly amount |
| --- | ---: |
| Founder salary or replacement cost | TBD |
| Employee payroll and benefits | TBD |
| Contractors | TBD |
| Product and infrastructure tools | TBD |
| Sales and marketing tools | TBD |
| Legal, accounting, insurance, and administration | TBD |

The total must replace the current $10,000 fixed-cost assumption. If available hours cannot cover the daily work and product-readiness list, reduce scope before hiring.

## Weekly company rhythm

- **Monday:** Set one acquisition goal, one customer goal, and one product goal. Give each one owner and due date.
- **Wednesday:** Review stalled deals, stalled onboarding, and the largest product blocker. Assign the next action or remove the item.
- **Friday:** Update actuals against the financial model. Review audience, message, campaign, conversion, CAC, and retention results. Interview one lost prospect or inactive customer. Make one continue/change/stop decision.

## Customer and market evidence

The current customer choice is a hypothesis: small service businesses receiving leads from ads, referrals, or social media while managing follow-up across separate tools.

Collect this evidence before widening the market:

| Question | Evidence required | Actual |
| --- | --- | --- |
| Is the problem frequent? | Interview notes showing where conversations or follow-up are lost | TBD |
| Is it costly enough to fix? | Buyer states the missed work, labor, or revenue consequence in their own numbers | TBD |
| What do they use now? | Current CRM, inbox, spreadsheet, social, and ad-dashboard workflow recorded | TBD |
| Why would they switch? | Specific reason LOOPIE is preferred over keeping the current process | TBD |
| Will they pay? | Collected payment, accepted price, and decision-maker recorded | TBD |
| Can we reach enough buyers? | Count of qualified accounts reachable through the tested channels | TBD |

Start with these alternative categories. Replace them with the products and processes buyers actually name during interviews:

| Alternative | Why buyers keep it | LOOPIE must prove |
| --- | --- | --- |
| Spreadsheet and inboxes | Cheap and familiar | One system saves enough time or missed follow-up to justify switching |
| CRM or marketing suite | Already purchased and broad | LOOPIE is faster to adopt and clearer for daily messaging work |
| Social and ad dashboards | Native channel control | Cross-channel contact and lead context changes decisions |
| Agency or manual staff work | Someone else handles the work | LOOPIE produces consistent results with less ongoing labor |

Use bottom-up market sizing:

```text
reachable annual revenue = qualified reachable accounts × expected paid conversion × collected monthly price × 12
```

Do not add a broad market-size claim until the qualified-account count and conversion rate have evidence.

For each interview or sales call, record: business type, team size, monthly lead volume, current tools, where follow-up fails, who owns the problem, current spend, price response, objections, and next action.

Day-30 segment decision:

- **Keep:** at least 16 demos and 4 collected payments from the 160-contact test.
- **Narrow or change the offer:** demos occur but fewer than 4 buyers pay.
- **Change the audience or problem:** fewer than 10 qualified prospects complete a demo.
- **Stop the test:** buyers do not report the problem or will not replace their current process.

## Marketing strategy: LOOPIE runs LOOPIE

Use LOOPIE to acquire LOOPIE customers. The company account must hold every prospect, message, ad, social post, reply, lead, demo, payment, and follow-up. This builds the customer base and exposes product failures.

### First customer hypothesis

Start with small service businesses that already receive leads from ads, referrals, or social media but manage follow-up across separate tools. Sell to the owner or person responsible for sales and marketing.

This is a test audience, not a permanent market definition. Keep it only if the first 30 days produce demos and paid customers at acceptable cost.

### Offer used in marketing

Use one message:

> LOOPIE keeps your ads, contacts, leads, and social conversations in one place. Your team can see what needs a response and what happened next.

Use one primary call to action: **Book a 20-minute LOOPIE walkthrough.**

Do not market every feature. Show one complete example from incoming lead to follow-up and recorded outcome.

### How we use LOOPIE

| LOOPIE area | How the company uses it |
| --- | --- |
| Contacts | Store every qualified prospect and customer once; record company, role, segment, source, and consent |
| Audiences | Separate prospects by customer type, lead source, funnel stage, and recent activity |
| Messaging | Send outreach, demo reminders, onboarding messages, and approved follow-up |
| Leads | Track New → Contacted → Demo booked → Trial → Paid → Lost |
| Social | Plan posts, publish them, capture responses, and convert relevant conversations into leads |
| Ads | Run controlled campaigns, preserve creative versions, and connect each lead to its source when possible |
| Results | Compare contacts, demos, customers, revenue, CAC, and payback by source and campaign |

If a required LOOPIE feature is not ready, perform that step manually and record the gap inside LOOPIE. A missing feature should create a product decision; it should not erase the marketing record.

### Acquisition channels

Use the channels in this order:

1. **Founder-led outreach:** Build a qualified list, send personal messages, follow up, and book walkthroughs. This provides the fastest message and price feedback.
2. **Useful social content:** Publish examples of missed follow-up, fragmented lead handling, and how LOOPIE manages the work. Every post points to the walkthrough.
3. **Customer proof:** Turn real activation and outcome data into short case notes after receiving permission. State recorded facts; do not imply revenue causation without evidence.
4. **Referral requests:** Ask activated customers and relevant service providers for one introduction to a similar business.
5. **Paid ads:** Begin only after direct outreach proves that the offer books demos and closes customers. Use ads to scale a message that already works.

### Starting campaigns

| Campaign | Audience | Content | Desired action | What it tests |
| --- | --- | --- | --- | --- |
| LOOPIE runs LOOPIE | Qualified service-business owners | Screenshots and short demonstrations of our own LOOPIE account | Book a walkthrough | Whether using the product ourselves creates trust and interest |
| Where did the lead go? | Businesses running ads or active social accounts | A short lead-management audit followed by a LOOPIE demonstration | Book a walkthrough | Whether the missed-follow-up problem creates demand |

Run these two campaigns first. Change one major variable per test: audience, message, offer, creative, or channel. Preserve the previous version and its results. Do not add a third campaign until one of these produces a clear result.

### Marketing budget gates

The base financial model allows $3,000 per month for acquiring four customers, or $750 CAC.

- Keep paid-media tests small until direct outreach produces at least 10 completed demos and 2 paying customers using the same offer.
- Set a written spend cap and success measure before every campaign.
- Stop a campaign when it reaches its cap without producing the required next-stage action.
- Increase spend only when measured contribution per account is positive and projected CAC payback is six months or less.
- Customer ad spend is never mixed with LOOPIE's own marketing spend.

### Attribution rules

Every prospect must have an original source, campaign, first-touch date, current stage, and next action. Every paid customer must retain the source history that preceded the sale.

Report outcomes as:

- **Directly tracked:** a known message, post, or ad led to the recorded action.
- **Matched:** contact history supports a reasonable connection.
- **Platform attributed:** an advertising or social platform reports the conversion.
- **Unknown:** no defensible source is available.

Do not force credit onto a campaign. Unknown is a valid result.

## Customer-acquisition math

The base case requires four new paying customers each month.

| Funnel step | Working assumption | Monthly requirement |
| --- | ---: | ---: |
| Qualified contacts | — | 160 |
| Contacts that book a demo | 10% | 16 demos |
| Demos that become paid customers | 25% | 4 customers |
| Workdays per month | 20 | 8 new qualified contacts/day |

This is a starting quota, not a market fact. After 30 days, replace both conversion rates with actual pipeline results and recalculate the required daily outreach.

```text
required demos = target new customers ÷ actual demo close rate
required contacts = required demos ÷ actual contact-to-demo rate
daily contacts = required contacts ÷ selling days
```

### Sales pipeline definitions

| Stage | Entry rule | Required next action |
| --- | --- | --- |
| Qualified | Fits the current customer test and has the problem LOOPIE addresses | Personal outreach with a date |
| Contacted | A real message or call was completed | Follow-up date or reply outcome |
| Demo booked | Date and decision-maker are confirmed | Reminder and preparation |
| Demo completed | Buyer saw the core workflow and stated a decision or objection | Payment request, follow-up, or loss reason |
| Paid | Payment was collected | Onboarding owner and activation due date |
| Activated | Account completed the activation definition below | Customer check-in and usage review |
| Lost | Buyer declined or became unresponsive after the defined follow-up | Loss reason and future eligibility |

Do not count an account in more than one active stage. A verbal commitment is not a paid account. Review every lead without a next action each day.

## Unit economics

Using the base assumptions:

| Measure | Calculation | Result |
| --- | --- | ---: |
| Monthly revenue per account | — | $299 |
| Recurring COGS per account | — | $45 |
| Contribution per account | $299 − $45 | $254 |
| Contribution margin | $254 ÷ $299 | 85% |
| CAC payback including onboarding | ($750 + $100) ÷ $254 | 3.4 months |
| Break-even accounts before new acquisition spend | $10,000 ÷ $254 | 40 |
| Break-even accounts while adding four customers/month | ($10,000 + $3,000 + $400) ÷ $254 | 53 |

Recurring COGS must include messaging and social API usage, hosting allocation, payment processing, and directly attributable support. Onboarding is tracked separately. Refunds, credits, discounts, and failed collections reduce realized revenue. Usage limits or overage pricing are required if heavy usage can make an account's contribution negative.

Assign each labor hour once: sales to CAC unless already salaried in fixed cost; onboarding to onboarding cost; customer support to COGS; product and administration to fixed operating cost.

Do not publish lifetime value until retention has been observed. After enough cohort history exists, a rough check is:

```text
LTV = monthly contribution per account ÷ observed monthly churn
```

## Price and cost sensitivity

The table shows active accounts required to cover fixed cost before new acquisition spending. It assumes $36 of recurring vendor/support cost plus payment processing equal to 3% of subscription revenue.

| Monthly price | $5,000 fixed cost | $10,000 fixed cost | $15,000 fixed cost |
| ---: | ---: | ---: | ---: |
| $199 | 32 | 64 | 96 |
| $299 | 20 | 40 | 60 |
| $499 | 12 | 23 | 34 |

This is the central pricing test. A low price requires more customers, more support capacity, and more cash before break-even.

## Base-case 12-month projection

This projection uses the working assumptions above. New customers are treated as arriving evenly through each month. Churn is modeled as an expected value, so customer counts include decimals.

| Month | Open | New | Churned | End | Revenue | Ending MRR | COGS | Onboarding | Acquisition | Fixed | Profit/(loss) | Ending cash |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.0 | 4 | 0.0 | 4.0 | $598 | $1,196 | $90 | $400 | $3,000 | $10,000 | ($12,892) | $87,108 |
| 2 | 4.0 | 4 | 0.1 | 7.9 | $1,782 | $2,368 | $268 | $400 | $3,000 | $10,000 | ($11,886) | $75,222 |
| 3 | 7.9 | 4 | 0.2 | 11.8 | $2,942 | $3,517 | $443 | $400 | $3,000 | $10,000 | ($10,900) | $64,322 |
| 4 | 11.8 | 4 | 0.2 | 15.5 | $4,080 | $4,642 | $614 | $400 | $3,000 | $10,000 | ($9,934) | $54,388 |
| 5 | 15.5 | 4 | 0.3 | 19.2 | $5,194 | $5,746 | $781 | $400 | $3,000 | $10,000 | ($8,987) | $45,401 |
| 6 | 19.2 | 4 | 0.4 | 22.8 | $6,286 | $6,827 | $945 | $400 | $3,000 | $10,000 | ($8,059) | $37,341 |
| 7 | 22.8 | 4 | 0.5 | 26.4 | $7,356 | $7,886 | $1,106 | $400 | $3,000 | $10,000 | ($7,150) | $30,191 |
| 8 | 26.4 | 4 | 0.5 | 29.8 | $8,405 | $8,924 | $1,264 | $400 | $3,000 | $10,000 | ($6,259) | $23,932 |
| 9 | 29.8 | 4 | 0.6 | 33.3 | $9,433 | $9,942 | $1,419 | $400 | $3,000 | $10,000 | ($5,386) | $18,547 |
| 10 | 33.3 | 4 | 0.7 | 36.6 | $10,440 | $10,939 | $1,570 | $400 | $3,000 | $10,000 | ($4,530) | $14,017 |
| 11 | 36.6 | 4 | 0.7 | 39.9 | $11,428 | $11,916 | $1,719 | $400 | $3,000 | $10,000 | ($3,691) | $10,326 |
| 12 | 39.9 | 4 | 0.8 | 43.1 | $12,395 | $12,874 | $1,864 | $400 | $3,000 | $10,000 | ($2,869) | $7,457 |

`Ending cash` is a simplified pre-tax balance. It assumes revenue is collected in the modeled month and excludes financing, debt service, capital purchases, taxes, and working-capital timing.

### What the base case says

- LOOPIE ends year one at about 43 active customers and $12,874 MRR.
- It consumes about $92,543 of the assumed $100,000 starting cash during year one.
- It is still losing about $2,869 in month 12.
- Under the same assumptions, monthly operating profit turns positive around month 16.
- Cash falls to roughly $3,600 before recovering. The plan has almost no room for missed sales, higher churn, or cost overruns.
- If nothing changes through month 24, the model reaches about 77 accounts, $22,976 MRR, $5,799 monthly profit, and $31,471 cash. This assumes no hiring or cost increase.

## Scenario check at month 12

Each scenario changes only price, new customers, churn, and CAC. Recurring COGS is $36 plus 3% of price, onboarding remains $100 per new account, fixed cash cost remains $10,000, and starting cash remains $100,000.

| Scenario | Price | New/month | Churn | CAC | Customers | MRR | Month-12 profit/(loss) | Ending cash |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Downside | $199 | 2 | 3.0% | $1,000 | 20.4 | $4,062 | ($9,107) | ($26,009) |
| Base | $299 | 4 | 2.0% | $750 | 43.1 | $12,874 | ($2,869) | $7,457 |
| Upside | $499 | 5 | 1.5% | $500 | 55.3 | $27,589 | $10,823 | $97,087 |

The downside case runs out of cash around month 10. The base case survives but is fragile. Price, conversion, and retention must be tested early rather than assumed.

## Funding and cash contingency

The current model needs more than a $100,000 opening balance if the company keeps a basic reserve.

| Capital requirement | Amount |
| --- | ---: |
| Base-case peak cumulative burn | $96,400 |
| Minimum reserve: three months of modeled fixed cost | $30,000 |
| Capital required before remaining build cost | $126,400 |
| Remaining product build and launch cost | TBD |
| Total capital required | $126,400 + remaining build cost |
| Actual committed capital | TBD |
| Funding gap | Total required − committed capital |

Decide and record the funding source before following the base growth plan:

- Founder capital already available.
- Customer revenue or prepayments already collected.
- Debt, investment, or other committed funding.
- Spending reduction that lowers the modeled burn.

Cash rules:

- Maintain a minimum reserve equal to three months of current fixed commitments.
- Reforecast immediately if new paid accounts remain below four for two months or churn exceeds 2% for two months.
- Pause paid acquisition and hiring if the 90-day forecast falls below the reserve.
- Do not hire or sign a new fixed commitment until its cost is included in the monthly projection.
- If funding is not committed, reduce fixed cost, raise price, improve conversion, or delay scaling before cash reaches the reserve.

## 90-day validation plan

| Test | Action | Pass evidence | Deadline | Owner |
| --- | --- | --- | --- | --- |
| Customer | Build the first 160-contact audience; run founder outreach and the two starting campaigns | Four customers pay; reasons for buying and declining are recorded | Day 30 | TBD |
| Price | Offer the same plan at controlled price points | Offer, acceptance, discounts, usage, and collected price are recorded by price point | Day 45 | TBD |
| Activation | Measure time from payment to first useful result | Paid customers complete the core loop and blockers are known | Day 60 | TBD |
| Cost to serve | Log onboarding, support, API, hosting, and payment cost per account | Each active account has positive measured contribution | Day 60 | TBD |
| Retention | Track weekly use and ask customers to continue or renew | Day-90 cohort retention is reported and a retention threshold is set for the next cohort | Day 90 | TBD |
| Repeatability | Repeat the best audience/message pair; test one capped paid or retargeting campaign only if the budget gate is met | Actual conversion and CAC by source support a revised acquisition plan | Day 90 | TBD |

For this test, **activated** means the customer connects or imports data, sends or publishes through LOOPIE, and views a resulting activity or outcome.

Day 90 validates demand and unit-economic inputs. It does not prove company profitability; the base model does not reach monthly profit until approximately month 16.

## Management rules

- Do not increase paid acquisition until contribution per account is positive.
- Proposed CAC payback cap: six months. Change price, channel, or onboarding if actual payback exceeds it.
- At five paying customers, replace sales, activation, support, and direct-cost assumptions with actuals.
- At 90 days, report observed cohort retention. Do not treat a small cohort as a stable long-term churn rate.
- Count founder labor at its replacement cost. A business dependent on unpaid labor has not proven economic profitability.
- Define a minimum cash reserve before hiring. Hire only when trailing three-month operating profit before the proposed hire covers three months of its loaded cost and post-hire cash remains above that reserve.
- The profitability POC passes only after economic operating profit is positive for three consecutive months and acquired customers remain long enough to recover CAC.

## Weekly scorecard

Update one row every Friday:

- Qualified prospects contacted.
- Demos booked and completed.
- Trials or onboarding accounts started.
- New paying customers and reasons lost.
- Activated paying customers.
- Active paying customers and cancellations.
- MRR and cash collected.
- Acquisition cash and sales hours.
- Direct vendor cost and support hours per account.
- Operating expenses, net cash flow, cash balance, and runway.

## Next seven days

1. Assign owners for Growth, Customer, Product, and Finance.
2. Complete the product-readiness status, remaining work, due dates, and build-cost estimate.
3. Enter actual cash, committed funding, compensation, payroll, contractors, tools, debt, and monthly costs; calculate the funding gap.
4. Confirm the first customer type and begin recording interview evidence.
5. Approve the first price test and define normal usage limits.
6. Create the company's LOOPIE workspace with sources, audiences, lead stages, and required next actions.
7. Build and import the first 100-account prospect list; begin eight qualified contacts per day.
8. Launch the first outreach campaign and the first “LOOPIE runs LOOPIE” social example.
9. Create the weekly scorecard and replace assumptions as actual results arrive.
