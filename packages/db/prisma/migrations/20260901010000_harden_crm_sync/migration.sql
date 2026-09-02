ALTER TABLE `Integration`
  MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL;

ALTER TABLE `ExternalEvent`
  MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL;

ALTER TABLE `ExternalContactRecord`
  MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL;

ALTER TABLE `Integration`
  ADD COLUMN `lastSyncAttemptAt` DATETIME(3) NULL,
  ADD COLUMN `lastSyncError` TEXT NULL,
  ADD COLUMN `syncHasMore` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `ImportJob`
  ADD COLUMN `integrationId` VARCHAR(191) NULL;

CREATE INDEX `ImportJob_integrationId_createdAt_idx`
  ON `ImportJob`(`integrationId`, `createdAt`);

ALTER TABLE `ImportJob`
  ADD CONSTRAINT `ImportJob_integrationId_fkey`
  FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ExternalContactRecord`
  ADD COLUMN `sourceSnapshot` JSON NULL;
