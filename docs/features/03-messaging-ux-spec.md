# Messaging UX Specification

## Objective
Make the entire POC feel like a messaging product rather than a CRM dashboard.

## Primary Layout

```text
MESSAGES

[ Email ] [ Text ] [ Social ]

To
[ Past customers ▾ ]
312 people

Message
┌──────────────────────────────────────────┐
│ We haven't seen you in a while...        │
└──────────────────────────────────────────┘

Follow up automatically
[ Off ▾ ]

                               [ Send ]
```

## Primary Interaction Order
1. Select audience.
2. Select channel.
3. Write or choose content.
4. Optionally configure follow-up.
5. Review recipients.
6. Send.

Avoid multi-step wizards unless legally or technically required.

## Audience Selector
Show enough detail to create confidence without turning it into a CRM screen.

```text
Past customers
312 people

287 have email
241 have mobile
Last purchase: 90+ days ago
Austin service area
```

Suggested presets: Everyone, Leads, Customers, Past customers, Repeat customers, No response, Recently contacted, Custom audience.

## Content Entry
Support plain text, basic rich text for email, personalization, links, and media where supported.

Secondary actions: **Use template · Reuse past message · Save as template**.

## Automation
Automation appears directly below the message.

```text
Follow up automatically
[ Off ]
```

Enabled:

```text
If they don't reply
[ Wait 3 days ] → [ Send follow-up ]

[ + Add one more step ]
```

## Recent Activity

```text
Recent messages

Summer follow-up
Email · 312 sent
41 opened · 12 replied · 4 sales

New lead response
Text · Automatic
18 sent · 11 replied
```

## Contact Detail
Clicking a person opens a side panel rather than navigating away.

```text
JANE SMITH

Lead
jane@example.com
(512) 555-0192

Jun 3  Website inquiry
Jun 3  Text sent
Jun 3  Replied
Jun 4  Estimate sent
Jun 7  Sale · $850

[ Email ] [ Text ]
```

## UX Rules
- No marketing jargon unless necessary.
- Avoid “journey,” “orchestration,” and “workflow builder.”
- Prefer “Follow up automatically.”
- Prefer “Who should get this?” over “Target segment.”
- Prefer “What happened?” over analytics terminology.
- Never make users understand the database model.
