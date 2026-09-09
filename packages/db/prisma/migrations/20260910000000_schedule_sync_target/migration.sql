-- CreateTable
CREATE TABLE `ScheduleSyncTarget` (
    `id` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `spreadsheetId` VARCHAR(191) NOT NULL,
    `spreadsheetName` VARCHAR(191) NOT NULL,
    `sheetTab` VARCHAR(191) NOT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `lastSyncAttemptAt` DATETIME(3) NULL,
    `lastSyncError` TEXT NULL,
    `lockToken` VARCHAR(191) NULL,
    `lockExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScheduleSyncTarget_integrationId_key`(`integrationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ScheduleSyncTarget` ADD CONSTRAINT `ScheduleSyncTarget_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
