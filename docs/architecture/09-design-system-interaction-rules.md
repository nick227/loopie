# Design System & Interaction Rules

## Objective
Keep the POC extremely simple while preserving room for deeper CRM functionality later.

## Primary Product Rule
**Do not make users understand our internal system.**

## Navigation
Phase 1 may have only **Messages** plus secondary settings/account controls.

Avoid adding navigation simply because an entity exists in the database.

## Vocabulary
Prefer: Messages, Contacts, Leads, Customers, Email, Text, Social, Follow up, Sales, Results, Templates.

Avoid unless required: Campaign, Journey, Workflow, Orchestration, Funnel, Sequence, Marketing automation, Object, Entity.

## Layout Priority
1. Audience
2. Channel
3. Content
4. Follow-up
5. Send
6. Recent outcomes

## Progressive Disclosure
Advanced information appears only when requested: audience details expand, automation expands when enabled, customer history opens in a side panel, and results open from recent sends.

## Buttons
Every primary view should have one clear primary action. Avoid competing primary buttons.

## Status Language
Use plain statuses: Draft, Scheduled, Sent, Needs reply, Follow-up due, Won, Lost.

## Empty States

```text
No contacts yet.

Import your customer list to send your first message.

[ Import contacts ]
```

## Errors
Explain what failed, what was affected, whether anything was sent, and what the user can do next.

## Accessibility
Keyboard navigable, clear focus states, sufficient contrast, labels not dependent on color, suitable touch targets, and responsive composer behavior.

## Simplicity Test
Before adding a visible control, ask:
**Does the user need this to complete the current job?**

If not, hide it or defer it.
