-- PageType grows from 6 to 8 values (PORTFOLIO split out of STUDIO, GENERAL added) — see
-- docs/strategy/pages-page-types-and-style-axes-roadmap.md §9. Additive to the enum; existing
-- rows (Portfolio's own LandingPageTemplate row) are reassigned by application code
-- (ensureSystemTemplates.ts), not by this migration.
--
-- This migration originally also created an `AdCatalogPreview` table (a server-side screenshot
-- cache for the Ads starter catalog); that whole approach was replaced the same day by rendering
-- the starter catalog's thumbnails client-side from the real Ad preview components instead — see
-- CLAUDE.md's "Ad starter catalog" entries. Edited in place (not superseded by a later migration)
-- since this file was still same-day, uncommitted, unshipped history when the design changed.
--
-- Generated via `prisma migrate diff --from-schema-datamodel <pre-change schema.prisma>
-- --to-schema-datamodel packages/db/prisma/schema.prisma --script`, not `prisma migrate dev` —
-- same reasoning as migration 20260910010000 (this dev database's pre-existing migration-history
-- backlog, applied via `db push` historically — see that migration's own header comment).
-- AlterTable
ALTER TABLE `LandingPageTemplate` MODIFY `pageType` ENUM('HOME', 'LANDING', 'STUDIO', 'PORTFOLIO', 'EMAIL_CAPTURE', 'STORE', 'EVENT', 'GENERAL') NOT NULL DEFAULT 'LANDING';

-- AlterTable
ALTER TABLE `PageTypeCapability` MODIFY `pageType` ENUM('HOME', 'LANDING', 'STUDIO', 'PORTFOLIO', 'EMAIL_CAPTURE', 'STORE', 'EVENT', 'GENERAL') NOT NULL;
