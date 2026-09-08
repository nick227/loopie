# Database migrations and deployment

## The rule going forward

**Every schema change ships with a real migration file, created via `prisma migrate dev`.**
Never edit `packages/db/prisma/schema.prisma` and ship the change with `db push` alone. `db push`
stays fine for local, throwaway experimentation — trying out a shape before you're sure of it —
but never as the last step before a PR. CI enforces this (see below): if `schema.prisma` changes,
the same push/PR must also add a new file under `packages/db/prisma/migrations/`.

This rule exists because it was skipped for a long time. By 2026-09-08, `prisma migrate status`
against production showed real migrations missing entirely from its `_prisma_migrations` history,
and — more seriously — direct schema inspection found the actual live database was missing tables
and columns that already-deployed code depended on (`PlatformAffiliateClass.isDefault`/
`defaultSlot`, the `SiteInquiry` table, `User.siteInboxEmailNotifications`,
`BusinessAffiliateAttribution.status`/`approvedAt`/`lockedAfterPaymentAt`/etc.) — a live production
gap, fixed the same day (see the historical baseline below). Separately, comparing the full
migrations folder against `schema.prisma` (via `prisma migrate diff --from-migrations ...
--to-schema-datamodel ...`) shows extensive _older_ drift going back further — years of `db push`
shipping schema changes with no migration file ever written for them. That older drift is a real,
separate cleanup (retroactively writing accurate historical migrations, or accepting the gap and
starting clean from here), not something to gate every PR on — which is why the CI check below
enforces discipline on _new_ changes rather than demanding the whole history reconciles.

## How production deploy works now

Both `apps/server` and `apps/ad-server` (they share one database) run `prisma migrate deploy`
automatically as part of their container's `CMD`, before the actual server process starts:

```
pnpm --filter "./packages/db" exec prisma migrate deploy && exec node_modules/.bin/tsx apps/server/src/index.ts
```

This is the same `pnpm --filter "./packages/db" exec prisma <cmd>` invocation the Dockerfiles'
own builder stage already used for `prisma generate` — just `generate` swapped for
`migrate deploy`. If migrations fail, the container exits non-zero and never starts serving;
Railway's existing health check + `restartPolicyType: ON_FAILURE` mean the previous, working
version keeps serving traffic instead of cutting over to a broken one. Running it in both
services is deliberate redundancy, not a mistake — either could be the first to restart after a
schema change ships, and Prisma's own advisory locking makes concurrent/redundant attempts from
both (or from multiple replicas of either) safe.

Since pushing to `main` auto-deploys and there is no staging environment for this project (Railway
project `loopie` has exactly one environment, `production`) — the migration for a given change
runs for the first time, for real, at the moment it deploys. Test it against a local database
(`pnpm --filter @project/db db:push`, or better, apply the real migration file with
`prisma migrate deploy` against a scratch database) before merging.

## The one-time historical baseline (2026-09-08)

Production's `_prisma_migrations` table had never been fully initialized. Before the automatic
`migrate deploy` step above could safely ship (running it against an un-baselined production
would have failed immediately with `P3005: database schema is not empty`), history was
reconciled by hand, once:

1. `prisma migrate status` against production showed 14 of 19 migrations already tracked, and 5
   not: `20260907010000_platform_affiliate_default_class`,
   `20260907020000_platform_affiliate_class_default_slot`, `20260907020000_site_inbox`,
   `20260907030000_affiliate_attribution_state_model`, and
   `20260907160000_saved_import_sources`.
2. Direct schema inspection (`information_schema.COLUMNS`/`.TABLES`) showed the first 4 of those
   were missing from the _real_ database too, not just untracked — i.e. real, live gaps, not
   just bookkeeping. `prisma migrate deploy` was run for real against production for exactly
   those 4 (temporarily moving the 5th migration's folder aside first, so only those 4 applied).
   Both `BusinessAffiliateAttribution` and `PlatformAffiliateClass` had zero existing rows at the
   time, so there was no backfill-correctness risk.
3. The 5th (`saved_import_sources`) was deliberately left pending — its feature code isn't
   shipped yet, so its schema shouldn't land in production ahead of that. It's purely additive
   and already validated safe (see the CLAUDE.md entry for `78a3b89`), so it will simply be the
   first migration the new automatic `migrate deploy` step (above) applies for real once that
   feature ships.
4. A direct `prisma migrate diff --from-url <production> --to-schema-datamodel schema.prisma`
   (production compared straight against the schema file, independent of migration-file history)
   confirmed the _only_ remaining difference was that one pending migration — nothing else was
   silently missing from the live database.

If a fresh environment (a real staging environment, or a disaster-recovery restore onto a new
database) is ever needed, and it's seeded from a schema snapshot rather than replayed through
every migration in order, it may need the same one-time reconciliation:
`prisma migrate resolve --applied <name>` for each migration whose changes the snapshot already
contains, before `prisma migrate deploy` will proceed.

## If the CI drift check fails

It means `schema.prisma` changed without a matching new file under
`packages/db/prisma/migrations/` in the same push/PR. Fix it by running
`prisma migrate dev` (from `packages/db`, against your local database) — it both creates the
migration file and applies it locally — then commit the generated file alongside your
`schema.prisma` change. Don't hand-write the migration SQL or use `db push` to "resolve" the
check; let `migrate dev` generate it from the real diff.
