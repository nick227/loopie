# Sales Flow Specification

## Objective
Allow communication activity to naturally become a lightweight sales process.

## Principle
Do not force users into a traditional CRM pipeline unless they need one. Sales status should appear as useful context around conversations.

## Default Stages
**New · Contacted · Qualified · Quoted · Won · Lost**

## Example

```text
Jane Smith
Lead · Qualified

Last message:
“Yes, Tuesday works for me.”

[ Email ] [ Text ]

Sales
[ Qualified ▾ ]

Estimated value
[ $850 ]

[ Mark won ]
```

## Lead Creation
A Lead can be created when a contact is manually marked as a lead, replies to a sales-oriented message, is imported as a lead, or is created manually.

Phase 1 does not require automatic AI qualification.

## Status Changes
Users can change status directly from the contact side panel. Every change creates an Interaction event.

## Won
When marked Won:
- prompt for sale value,
- optional product/service,
- optional sale date,
- stop active lead follow-up,
- update contact to Customer,
- attribute sale to originating message when known.

## Lost
When marked Lost:
- stop active sales follow-up,
- optionally capture reason,
- keep contact available for future appropriate outreach.

## Repeat Sales
A Customer may later have another Lead. Do not force the relationship into a single permanent pipeline.

## Results Connection

```text
312 recipients
41 replies
14 leads
6 sales
$4,850 recorded revenue
```

## POC Rule
If sales tracking adds friction to sending messages, messaging wins. Sales functionality remains lightweight and contextual.
