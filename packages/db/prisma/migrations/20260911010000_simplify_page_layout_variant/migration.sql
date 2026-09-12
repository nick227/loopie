-- Design-committee Layout review (2026-09-11): ALTERNATING removed outright (its media/copy
-- row-mirror mechanism was applied to plain title+body content with no media, producing a
-- disconnected, unreadable split), EDITORIAL folded into SPLIT (its one real idea — oversized
-- asymmetric display type — is a stronger presentation of Split, not a separate axis). Remap
-- existing rows BEFORE narrowing the enum, so no live page is left pointing at a value that no
-- longer exists: ALTERNATING has no principled successor (it was misapplied everywhere it
-- appeared) so it falls back to the safe neutral default, STACKED; EDITORIAL maps to its direct
-- successor, SPLIT.
UPDATE `LandingPage` SET `layoutVariant` = 'STACKED' WHERE `layoutVariant` = 'ALTERNATING';
UPDATE `LandingPage` SET `layoutVariant` = 'SPLIT' WHERE `layoutVariant` = 'EDITORIAL';
UPDATE `PublishedPageVersion` SET `layoutVariant` = 'STACKED' WHERE `layoutVariant` = 'ALTERNATING';
UPDATE `PublishedPageVersion` SET `layoutVariant` = 'SPLIT' WHERE `layoutVariant` = 'EDITORIAL';

-- AlterTable
ALTER TABLE `LandingPage` MODIFY `layoutVariant` ENUM('STACKED', 'SPLIT', 'CENTERED') NOT NULL DEFAULT 'STACKED';

-- AlterTable
ALTER TABLE `PublishedPageVersion` MODIFY `layoutVariant` ENUM('STACKED', 'SPLIT', 'CENTERED') NULL;
