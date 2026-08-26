Before starting Phase 3 frontend work, extend the architecture to cover a major missing acquisition layer: **Landing Pages, Forms, and first-party ad serving**.

LOOPIE should now support the full acquisition chain:

`Campaign → Creative → Deployment / Ad Unit → Landing Page → Form → Submission → Contact → Lead → Message/Automation → Sale`

### Landing Page Management

Build first-class landing-page support into LOOPIE now.

Phase 1 authoring should be intentionally constrained, **not a freeform WYSIWYG builder**. Users create a page from a structured template and can edit:

- text/content
- images/assets
- CTA labels/links
- form selection and fields
- theme tokens / branding
- basic section visibility/order where the template allows it

Pages must support:

- draft / published lifecycle
- immutable published versions
- preview
- LOOPIE-hosted publishing
- downloadable/exportable HTML package
- custom slug/domain-ready architecture
- reusable landing-page templates
- assets from the existing shared Asset system

Keep the template format product-independent so a future **Formerly** template community/catalog can supply templates that LOOPIE imports.

Model the distinction explicitly:

`LandingPageTemplate → LandingPage → PublishedPageVersion`

### Forms

Forms are first-class reusable entities rather than embedded JSON owned by a page.

Add:

- `Form`
- `FormField`
- `FormSubmission`

A LandingPage references a Form.

Submission must perform the canonical identity transition:

`anonymous session → FormSubmission → resolve/create Contact → create Lead`

Preserve attribution from the originating Campaign, Creative, Deployment, Ad Unit, landing page, session, click ID and UTMs where available.

Do not create a second Contact/Lead model.

### Metrics / Attribution

Extend analytics so we can measure the complete funnel:

- ad impressions
- ad clicks
- landing-page views
- unique sessions
- form starts if captured
- form submissions
- landing-page conversion rate
- leads
- sales
- revenue

These metrics must roll up through:

`Landing Page → Creative → Campaign → Platform`

and also support page/template-level reporting.

The existing attribution path should be expanded rather than replaced.

### Dedicated Ad Server

Treat first-party ad serving as a **separate deployable Railway service inside the same LOOPIE Railway project**, not merely another HTTP route in the main API server.

Suggested monorepo boundary:

```text
apps/
  web/
  server/
  ad-server/
```

The ad-server is a genuine business service that we may eventually use for commercial ad serving beyond LOOPIE landing pages.

Responsibilities should include:

- serving hosted Ad Units / Creative variants
- impression recording
- click tracking and redirects
- session/click identifiers
- destination/landing-page resolution
- lightweight public embed endpoints
- very low-latency public traffic path

Keep account management, campaign CRUD, landing-page editing, forms, contacts, leads, sales, and administrative APIs in the primary server.

The ad-server should share canonical database/contracts where appropriate, but have its own deployable process, health endpoint, environment configuration, and Railway service.

### Ad Unit

External platform `Deployment` and our own first-party ad serving are different delivery mechanisms.

Do **not** overload Deployment.

Add a first-party concept such as:

`AdUnit`

linked to a Creative, with fields sufficient for:

- format
- status
- destination
- serving configuration
- Creative/version reference

The two paths become:

```text
Campaign → Creative → external Deployment
Campaign → Creative → first-party AdUnit
```

Both feed the same attribution and downstream Lead/Sale model.

### Architecture Principle

Maintain one shared business/customer spine:

`Business · Asset · Contact · Lead · Sale · Interaction · Attribution`

Landing pages, forms, external advertising, first-party ads, and Messages must all converge on that same model.

Do not create isolated “landing page CRM,” “form contacts,” or ad-server-specific lead records.

### Scope Order

Before building the previously planned frontend shell:

1. Update the canonical Prisma schema.
2. Update OpenAPI and regenerate SDK types.
3. Implement LandingPageTemplate / LandingPage / PublishedPageVersion.
4. Implement Form / FormField / FormSubmission.
5. Integrate submission → Contact/Lead + attribution.
6. Extend performance aggregation for page/form/ad-unit metrics.
7. Scaffold the dedicated `ad-server` Railway service.
8. Implement first-party AdUnit impression/click serving.
9. Add tests for the complete acquisition path.
10. Then continue into frontend work, now including landing-page management.

Keep this implementation production-shaped but constrained. **Do not build a drag-and-drop page builder yet.** The current goal is a reliable template-driven landing-page system with hosting, export, forms, attribution, and first-party ad serving.