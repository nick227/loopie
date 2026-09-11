-- Layout (2026-09-11) — a new, narrow structural-arrangement concept for the page editor,
-- independent of PageType and of the LandingPageTemplate ("Page Starter") a page was created
-- from. See PageLayoutVariant's doc comment in schema.prisma.

-- AlterTable
ALTER TABLE `LandingPage` ADD COLUMN `layoutVariant` ENUM('STACKED', 'SPLIT', 'CENTERED', 'ALTERNATING', 'EDITORIAL') NOT NULL DEFAULT 'STACKED';

-- AlterTable
ALTER TABLE `PublishedPageVersion` ADD COLUMN `layoutVariant` ENUM('STACKED', 'SPLIT', 'CENTERED', 'ALTERNATING', 'EDITORIAL') NULL;

-- Backfill mapping (migration/default only — TemplateSchema.renderer is not consulted at render
-- time going forward): existing pages built from the Studio/Portfolio Starters keep the closest
-- available structural equivalent instead of silently resetting to Stacked. Every other existing
-- page already got the correct value (STACKED) from the column default above.
UPDATE `LandingPage` lp
JOIN `LandingPageTemplate` t ON t.id = lp.templateId
SET lp.layoutVariant = 'EDITORIAL'
WHERE JSON_UNQUOTE(JSON_EXTRACT(t.schema, '$.renderer')) = 'studio';

UPDATE `LandingPage` lp
JOIN `LandingPageTemplate` t ON t.id = lp.templateId
SET lp.layoutVariant = 'ALTERNATING'
WHERE JSON_UNQUOTE(JSON_EXTRACT(t.schema, '$.renderer')) = 'portfolio';
