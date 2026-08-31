# Prisma drafts

Files in this directory are design-ready migration inputs, not active Prisma schema fragments.
Prisma does not import this directory, and `prisma db push` must never be pointed at these files.

`embeddable-published-objects-v1.prisma` prepares the additive identity, snapshot, event, and
projection models for the accepted Embed RFC. It intentionally does not finalize or encode the
Phase 0 sandbox flags, visibility thresholds, or click-navigation rules. Before activation:

1. resolve the remaining headed/background and WebKit Phase 0 gates;
2. reconcile the fragment against the then-current shared `schema.prisma`;
3. add inverse relation fields to existing models;
4. choose and test the live-data backfill order;
5. generate a reviewed migration or apply through the repository's established `db push` process;
6. run Prisma validation and migration tests against a disposable database.

Existing Page snapshot checksum/success fields must be introduced nullable, backfilled from frozen
snapshot data, verified, and only then made required. The existing
`FormSubmission(landingPageId, sessionId)` uniqueness also needs a separately reviewed compatibility
transition before embed submissions can rely on `embedSubmissionKey`; this draft does not silently
drop that historical constraint.

The current repository has no committed Prisma migration history, so this draft deliberately does
not create a `prisma/migrations` directory that could be mistaken for approved executable state.
