-- AlterTable
ALTER TABLE `ImportJob` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `eligible` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `endCursor` VARCHAR(191) NULL,
    ADD COLUMN `failed` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `hasMore` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mappingSnapshot` JSON NULL,
    ADD COLUMN `matched` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `scanned` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `schemaFingerprint` VARCHAR(191) NULL,
    ADD COLUMN `sourceId` VARCHAR(191) NULL,
    ADD COLUMN `startCursor` VARCHAR(191) NULL,
    ADD COLUMN `updatedContacts` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ImportSource` (
    `id` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `spreadsheetId` VARCHAR(191) NOT NULL,
    `spreadsheetName` VARCHAR(191) NOT NULL,
    `sheetTab` VARCHAR(191) NOT NULL,
    `mapping` JSON NULL,
    `schemaFingerprint` VARCHAR(191) NULL,
    `headers` JSON NULL,
    `needsReview` BOOLEAN NOT NULL DEFAULT true,
    `refreshPolicy` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `cursor` VARCHAR(191) NULL,
    `hasMore` BOOLEAN NOT NULL DEFAULT false,
    `lastRunAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `previewRowCount` INTEGER NOT NULL DEFAULT 0,
    `previewEligibleCount` INTEGER NOT NULL DEFAULT 0,
    `previewTruncated` BOOLEAN NOT NULL DEFAULT false,
    `lockToken` VARCHAR(191) NULL,
    `lockExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportSource_integrationId_createdAt_idx`(`integrationId`, `createdAt`),
    UNIQUE INDEX `ImportSource_integrationId_spreadsheetId_sheetTab_key`(`integrationId`, `spreadsheetId`, `sheetTab`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportSource` ADD CONSTRAINT `ImportSource_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `ImportSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Retain the last legacy source and its mapping, but require fresh schema review.
INSERT INTO `ImportSource` (`id`, `integrationId`, `label`, `spreadsheetId`, `spreadsheetName`, `sheetTab`, `mapping`, `needsReview`, `refreshPolicy`, `updatedAt`)
SELECT CONCAT('legacy_', `id`), `id`,
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.spreadsheetName')), 'Imported spreadsheet'),
  JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.spreadsheetId')),
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.spreadsheetName')), 'Imported spreadsheet'),
  JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.sheetTab')),
  JSON_EXTRACT(`providerConfig`, '$.columnMapping'), true, 'MANUAL', CURRENT_TIMESTAMP(3)
FROM `Integration` WHERE `provider` = 'GOOGLE_SHEETS'
AND JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.spreadsheetId')) IS NOT NULL
AND JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.sheetTab')) IS NOT NULL;

-- Only clear the legacy fields for integrations that were actually migrated above. The original
-- version of this statement matched every GOOGLE_SHEETS integration unconditionally, including
-- ones with no spreadsheetId/sheetTab yet selected (mid-setup) or a malformed providerConfig —
-- those never got an ImportSource row from the INSERT above, so clearing them here silently
-- destroyed their only setup progress with nothing to fall back on. Repeating the exact same
-- WHERE as the INSERT keeps the two in lockstep: an integration only loses its legacy fields once
-- it actually has a new ImportSource home for that state.
UPDATE `Integration` SET `providerConfig` = NULL, `syncCursor` = NULL, `syncHasMore` = false
WHERE `provider` = 'GOOGLE_SHEETS'
AND JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.spreadsheetId')) IS NOT NULL
AND JSON_UNQUOTE(JSON_EXTRACT(`providerConfig`, '$.sheetTab')) IS NOT NULL;
