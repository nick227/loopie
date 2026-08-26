# Customer & Lead Model

## Purpose
Define the minimum internal model needed to support messaging and sales without exposing unnecessary complexity to users.

## Core Entities

### Contact
A person or organization known to the business.

Core fields: id, name, email, phone, company, source, tags, created_at, last_contacted_at, and consent/eligibility by channel.

### Audience
A saved or temporary group of contacts. Types: predefined, saved filter, manual list, imported list.

### Lead
A contact with active sales potential. A Contact may become a Lead without duplicating the person.

Suggested lead fields: stage, owner, estimated value, source, opened_at, closed_at.

### Customer
A contact who has completed at least one sale. Customer is primarily a lifecycle state, not a separate person record.

### Sale
A completed commercial outcome: contact, lead where applicable, amount, date, product/service, source message, notes.

### Interaction
Any meaningful touchpoint: email sent, text sent, reply, social response, call logged, note, status change, quote sent, or sale recorded.

### Message
The content and send operation: channel, subject, body, audience, status, scheduled_at, sent_at, template, and automation settings.

## Lifecycle

```text
Contact
  ↓
Lead
  ↓
Contacted
  ↓
Qualified
  ↓
Quoted
  ↓
Won → Customer
  ↘
   Lost
```

A customer can later become a new Lead for another sale.

## Important Rules
- Never duplicate a person because lifecycle changes.
- A contact may have many messages, leads, and sales over time.
- One message may reach many contacts.
- One sale may be attributed to a message when appropriate.
- Channel permission is independent of sales status.
- Keep full event history for auditability and customer context.

## User-Facing Simplification
Users should mostly see Lead, Customer, Past customer, Won, and Lost. The internal model may be more detailed than the visible UI.
