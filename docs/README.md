# LOOPIE documentation

Reviewed 2026-09-13. Start with [CLAUDE.md](../CLAUDE.md) for current development guidance and [README](../README.md) for product capabilities and local setup. Code review confirms implementation presence, not production configuration or live service health.

## Current references

- [Navigation](architecture/00-unified-ia-navigation.md): current routes and shell.
- [Data model](architecture/00-unified-data-model.md): current model summary followed by historical design rationale; Prisma and OpenAPI define exact contracts.
- [Database migrations](deploy/database-migrations.md): required migration workflow.
- [Google Sheets CRM imports](crm/google-sheets.md): saved sources, mapping, and manual import.
- [Ad-server](../apps/ad-server/README.md): public runtime and routes.
- [Calendar implementation](../apps/web/src/pages/calendar/README.md).
- [Page layouts and themes](architecture/landing-page-layouts-and-themes.md).

## Specifications and plans

[Architecture](architecture), [features](features), [design](design), and [strategy](strategy) contain a mixture of design decisions, proposals, and dated implementation reports. Proposal scope and old completion/test counts are not proof of current behavior. In particular, older Campaign terminology, Home navigation, and lead-stage descriptions are superseded by the current references above. Check the relevant service, schema, and route before using an old spec as an implementation contract.

[Marketing](marketing) and [sales materials](sales-marketing/sales-materials.md) describe commercial positioning, not independently verified integration capabilities. [Archived documents](archive) retain historical context.

## Internal team training

1. [How our service works](operations/01-how-our-service-works.md).
2. [Daily account operations](operations/02-daily-account-operations.md).
3. [Client communication and approvals](operations/03-client-communication-and-approvals.md).

Commercial plan: [Business launch roadmap](strategy/business-launch-roadmap.md). Ads buying: [Ad budgets, metrics, SLAs, and strategies](operations/ad-budgets-metrics-slas.md).
