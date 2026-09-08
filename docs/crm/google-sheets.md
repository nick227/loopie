# Google Sheets as a CRM data source

The shared Data Actions menu opens `/integrations/google-sheets`. Users choose an existing
connected Google account or authorize another one. Each account can hold several saved sources —
independent spreadsheet/tab selections, each with its own mapping, schema fingerprint, cursor, and
run history. `/integrations/{id}/google-sheets` lists an account's saved sources and lets the user
pick a new spreadsheet via Google Picker, select a tab, and save it as a source;
`/integrations/{id}/google-sheets/sources/{sourceId}` is where a saved source's columns get mapped,
previewed, and imported. OAuth returns directly to the connected account's workspace. Google login
does not imply Sheets permission.

Credentials live on `Integration` (one row per connected Google account); source configuration and
sync state live on `ImportSource` (one row per saved spreadsheet/tab, `@@unique([integrationId,
spreadsheetId, sheetTab])`). Re-saving the same spreadsheet/tab is idempotent — it returns the
existing source rather than creating a duplicate. Run history (`ImportJob`, now `sourceId`-scoped)
persists per source: scanned/eligible/matched/created/updated/skipped/failed counts, the cursor
range covered, and the schema fingerprint that run validated against.

## Schema drift

Every `ImportSource` carries the SHA-256 fingerprint of its header row at the time its mapping was
last confirmed. A preview recomputes the current fingerprint and compares it: a mismatch sets
`needsReview`, falls back to a fresh auto-suggested mapping instead of reusing the stale one, and
blocks `sync` until the user reconfirms. A `sync` in progress also re-checks the fingerprint on
every page it reads — a spreadsheet edited mid-import stops the run cleanly (409, no partial
half-mapped contacts) rather than importing against columns that no longer mean what the saved
mapping thinks they mean.

## Portable table boundary

`TabularPreview` accepts headings and positional rows without knowing about Google, contacts, or
API mutations. Duplicate headings remain distinct by column index, and cell text is never
interpreted as HTML or executable formulas. `packages/sdk/src/lib/importMatrix.ts`'s
`createImportMatrix` builds this shape from any 2D array of raw values — Google's `values.get`
rows today; a CSV or paste-oriented source review is meant to share the same representation rather
than growing a parallel one.

Mapping reuses CSV/JSON header aliases, including `name`, `full_name`, `first_name`, `last_name`,
`email_address`, and `mobile`. Split names are joined when the full name is absent. Fields are
optional; an email, phone, or external ID is required for an eligible row. Profile fields are
retained on the external import record. Unmapped columns are ignored, and rows without identifiers
are skipped. Counts indicate eligible source rows, not guaranteed new contacts.

An editable spreadsheet should extend this boundary only after its persistence contract is defined:
typed columns, field validation, draft changes, undo, keyboard navigation, large-table
virtualization, and explicit save review. A spreadsheet formula engine and direct writes to Google
are separate features.

## Sync behavior and limits

This is a manual inbound pull, with up to 2,000 source rows per batch (`PAGE_SIZE=250` ×
`MAX_PAGES=8` in `ImportSourceService`) and a Continue import action. It is not scheduled or
bidirectional sync. Confirming a new mapping resets a source's cursor; a source's preview/sync
never touches another source's cursor, even against the same spreadsheet. A sync holds a short
lease (`lockToken`/`lockExpiresAt`, 15 minutes) so two concurrent imports of the same source can't
race each other; a run left `RUNNING` by a process that died is marked `FAILED` the next time that
source is synced, so history never shows a stuck-forever run.

Identifiers are scoped to spreadsheet and tab, using a mapped external ID when provided, otherwise
email or phone. Row reordering therefore does not change identifiers. A stable external ID is
preferable when email/phone may change. The same person appearing in two different sources (even
two tabs of the same spreadsheet) still resolves to one contact via the existing identity
resolution pipeline — sources don't create parallel identity spaces.

The first row must contain headings. Preview reads and reports at most 5,000 data rows
(`PREVIEW_LIMIT` + a look-ahead row) — bounded by the actual Sheets API range requested
(`Math.min(tab.rowCount, PREVIEW_LIMIT + 2)`), not by fetching the tab in full first. Sheets can
change between preview and import: this is not an immutable snapshot. Export creates a separate
sheet of at most 5,000 active contacts, independent of any saved source. Google Picker requires the
existing browser key and app configuration.

Legacy single-spreadsheet-per-account data (`Integration.providerConfig`, from before sources
existed) migrated into one `ImportSource` row per account at rollout
(`20260907160000_saved_import_sources`), retaining its mapping but requiring a fresh review before
its next import (`needsReview: true`) since drift can't be verified retroactively. Accounts with an
incomplete legacy setup (no spreadsheet/tab chosen yet) migrated no row and kept their `providerConfig`
untouched, so nothing about their in-progress setup was lost.

## Next product decisions

Reuse source review for audience selection and messaging personalization, with destination-specific
validation. Keep campaign approval, recipient eligibility, consent, scheduling, and sending in
their existing workflows. Do not make editing a raw cell implicitly send a message or spend
advertising budget.

A future mapping adapter can preserve arbitrary columns as custom profile fields and show
normalized destination previews alongside raw values. Introduce those fields with clear naming and
audience/filter semantics rather than silently creating CRM schema from every heading.

Deleting a saved source (as opposed to leaving it unused) isn't exposed yet — no product need has
named it.
