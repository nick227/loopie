# Audience Segmentation Specification

## Objective
Allow users to choose meaningful recipient groups without making them build database queries.

## Default Audiences
- **Everyone** — all eligible contacts for the selected channel.
- **Leads** — contacts currently in an active sales process.
- **Customers** — contacts who have completed a sale.
- **Past Customers** — customers with no recent active sale.
- **Repeat Customers** — customers with multiple recorded sales.
- **No Response** — contacts messaged without a reply within a defined period.
- **Recently Contacted** — contacts with recent outbound communication.
- **Custom Audience** — user-defined filter group.

## Available Filters

### Relationship
Lead status, customer status, purchase count, last purchase date, lifetime value.

### Communication
Has email, has mobile, email eligible, SMS eligible, last contacted, replied/did not reply, clicked, unsubscribed.

### Business Metadata
Company, location, ZIP/postal code, tags, source, owner.

### Sales
Lead stage, quote sent, won/lost, sale value, last sale date.

## Audience UX

```text
Choose audience

○ Everyone                     1,248
○ Leads                          186
● Past customers                 312
○ Repeat customers                94
○ No response                     23

+ Create audience
```

Selecting an audience shows useful depth:

```text
Past customers · 312
287 have email
241 have mobile
124 purchased 6+ months ago
Average last sale: $420
```

## Custom Audience Example

```text
Customers
AND last purchase > 180 days ago
AND location = Austin
AND email eligible = yes

127 people
```

## Guardrails
- Never include opted-out contacts for that channel.
- Show eligible recipient count, not only total segment count.
- Explain why contacts are excluded.
- Dedupe before send.
- Save audience definition with the message for reporting.
