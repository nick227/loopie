-- Assistant operating-system content pass (2026-09-04): playbooks move from a flat repeated
-- step list to ordered layers (business-guidance/playbooks/index.ts's PlaybookLayerKey). This
-- records which layer a given goal cycle's plan targeted so Grow's "next cycle" can advance to
-- the next layer instead of repeating the same steps.
ALTER TABLE `AssistantGoalCycle` ADD COLUMN `layerKey` VARCHAR(191) NULL;
