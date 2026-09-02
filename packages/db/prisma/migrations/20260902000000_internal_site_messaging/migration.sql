-- Add native business-to-business and guest messages to the existing omni inbox.
ALTER TABLE `InboxThread`
  ADD COLUMN `peerBusinessId` VARCHAR(191) NULL;

ALTER TABLE `InboxThread`
  MODIFY COLUMN `type` ENUM('CONTACT', 'ADVERTISEMENT', 'PAGE', 'INTEGRATION', 'BUSINESS', 'SYSTEM') NOT NULL;

ALTER TABLE `InboxMessage`
  MODIFY COLUMN `kind` ENUM('SYSTEM', 'EMAIL', 'SMS', 'SITE') NOT NULL DEFAULT 'SYSTEM';

CREATE UNIQUE INDEX `InboxThread_businessId_peerBusinessId_key`
  ON `InboxThread`(`businessId`, `peerBusinessId`);
CREATE INDEX `InboxThread_peerBusinessId_idx`
  ON `InboxThread`(`peerBusinessId`);

ALTER TABLE `InboxThread`
  ADD CONSTRAINT `InboxThread_peerBusinessId_fkey`
  FOREIGN KEY (`peerBusinessId`) REFERENCES `Business`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
