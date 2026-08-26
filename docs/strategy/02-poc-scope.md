# Phase 1 POC Scope

## Goal
Prove that one simple messaging surface can support customer outreach, lightweight CRM, sales follow-up, and basic automation.

## Primary Screen
**Messages**

The POC should avoid separate top-level pages for Contacts, Leads, Results, Automations, or Campaigns unless testing proves they are necessary.

## Required Capabilities

### Audience
- Import contacts.
- Create contacts manually.
- View basic contact details.
- Select predefined audiences.
- Create a custom audience using simple filters.
- Show recipient count before sending.
- Respect channel eligibility and opt-out status.

### Messaging
Supported channels: **Email, Text, Social post**.

Composer requirements: recipient/audience selector, channel selector, subject where applicable, message body, preview, personalization tokens, send now, schedule later, and test send.

### Templates
- Start from scratch.
- Use a saved template.
- Reuse a previous message.
- Save a message as a template.

### Automation
POC automation is intentionally constrained.

Examples:
- If no reply in 3 days → send follow-up.
- After reply → stop follow-up.
- After marked sale → stop sales sequence.
- After X days → remind staff.

No arbitrary visual workflow builder in Phase 1.

### Customer Context
Selecting a contact should show contact details, lead/customer status, communication history, notes, and basic sales outcome/history.

### Sales
Minimum statuses: **Lead, Contacted, Qualified, Quoted, Won, Lost, Customer**.

Sales outcomes may include sale amount, date, and product/service note.

### Results
For each sent message: recipients, delivered, opened where available, clicked where available, replied, unsubscribed, leads generated, and sales attributed where possible.

## Explicitly Out of Scope
Paid ad management, Google/Yelp review automation, prospect scraping, complex multi-step automations, advanced attribution, AI-generated campaigns, multi-location administration, reseller/agency management, billing/subscriptions, and deep role/permission systems.

## POC Success Criteria
A pilot business can import 100+ contacts, choose an audience, send an email or text, configure one follow-up rule, receive a reply, view that reply in customer history, mark the lead won, and see the outcome attached to the original message.
