# Attribution & Funnel Spec

## Core funnel
**View → Click → Lead → Sale**

## Event path
Ad → Click → Landing page → Form submission → Lead → Follow-up → Sale

## Tracking
Each deployment should support a unique tracked destination URL such as:
`https://go.example.com/c/8F3K2`

The redirect service records:
- campaign
- creative
- deployment
- platform
- timestamp
- anonymous session/visitor ID
- platform click ID when available

Then it redirects to the business destination.

## Website tracker
A lightweight first-party script may record:
- view
- click
- form submitted
- purchase

## Identity transition
The key attribution moment is form submission.

Anonymous visitor/session → identified lead/contact

The lead retains:
- campaignId
- creativeId
- deploymentId
- platform
- clickId
- landingSessionId

## Sale attribution
Sale → Contact → Lead → Click → Deployment → Creative → Campaign

## UX principle
Users record normal business events. Attribution happens silently.

## Attribution labels
- Directly tracked
- Platform attributed
- Matched
- Unknown/direct

Never imply certainty where there is no defensible connection.
