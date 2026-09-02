ALTER TABLE `Advertisement` ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Advertisement_businessId_deletedAt_idx` ON `Advertisement`(`businessId`, `deletedAt`);
