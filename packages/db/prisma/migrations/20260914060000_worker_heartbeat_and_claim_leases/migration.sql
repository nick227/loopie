-- AlterTable
ALTER TABLE `AutomationRun` ADD COLUMN `claimedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `claimedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `WorkerHeartbeat` (
    `pollerName` VARCHAR(191) NOT NULL,
    `lastTickAt` DATETIME(3) NOT NULL,
    `lastSuccessAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `lastErrorAt` DATETIME(3) NULL,

    PRIMARY KEY (`pollerName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
