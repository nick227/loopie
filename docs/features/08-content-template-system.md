# Content & Template System

## Objective
Help users communicate quickly using approved, reusable content without creating a separate content-management product.

## Entry Points
Inside Messages:

```text
What do you want to say?

[ Start from scratch ]
[ Use a template ]
[ Reuse past message ]
```

## Template Types

### Email
Welcome, follow-up, seasonal offer, thank you, re-engagement.

### Text
New lead response, appointment reminder, quick follow-up, re-engagement.

### Social
Promotion, announcement, testimonial, event.

## Template Fields
Name, channel, purpose, subject if applicable, body, media, CTA, personalization tokens, suggested audience, and optional automation defaults.

## Example

```text
Template: Past Customer Follow-Up

Suggested audience:
Past customers

Channel:
Email

Subject:
Still need help with {{service}}?

Message:
Hi {{first_name}}, ...

Suggested follow-up:
If no reply in 5 days → send one reminder
```

## Template Sources
- Product defaults
- Business-created templates
- MNC-created service templates
- Saved past messages

## Rules
- Templates never send automatically merely because they exist.
- Editing for one send does not overwrite the source unless explicitly saved.
- Show channel compatibility.
- Personalization tokens require safe fallbacks.
- Preview exactly what a recipient will see.
- Template automation must be visible before activation.

## Phase 1
Do not create a separate top-level Content Library. Surface templates only during message composition.
