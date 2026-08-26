# Automation Rules

## Objective
Make follow-up automation useful without exposing a complex automation platform.

## Product Language
Use **Follow up automatically**.

Avoid workflow, orchestration, sequence builder, or automation graph.

## Phase 1 Automation Model
Every automation follows:

**Trigger → Wait → Condition → Action → Stop**

Example:

```text
Message sent
→ wait 3 days
→ if no reply
→ send follow-up text
→ stop when they reply
```

## Supported Triggers
- Message sent
- Contact replies
- Lead status changes
- Sale recorded
- Date/time reached

## Supported Conditions
- Has replied
- Has not replied
- Lead is still open
- Lead reached stage
- Customer status
- Channel eligibility

## Supported Actions
- Send email
- Send text
- Create reminder
- Change lead status
- Notify account user
- Stop sequence

## Default Stop Conditions
Recipient replies, opts out, sale is won, lead is lost, contact becomes ineligible, or automation is manually paused.

## UI

```text
Follow up automatically
[ Off ]
```

```text
If they don't reply:
[ Wait 3 days ] → [ Send follow-up ]

Stop when:
✓ They reply
✓ Sale is recorded
```

## Limits for POC
- Maximum 2 automated follow-up actions.
- No nested branches.
- No arbitrary scripting.
- No cross-account automations.
- No external webhooks required for core POC.
- Automation must always be inspectable and pausable.

## Approval
A user reviews automation before activating it. Templates may include defaults, but those defaults must remain visible before send.

## Logging
Every automated action records rule, trigger, contact, timestamp, action, outcome, and reason skipped when applicable.
