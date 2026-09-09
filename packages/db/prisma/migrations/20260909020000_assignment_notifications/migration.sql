-- CreateTable
CREATE TABLE `AssignmentNotification` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `recipientUserId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `actorLabel` VARCHAR(191) NOT NULL,
    `taskTitle` VARCHAR(191) NOT NULL,
    `scheduledFor` DATETIME(3) NULL,
    `hasTime` BOOLEAN NOT NULL,
    `estimateMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `AssignmentNotification_businessId_recipientUserId_readAt_cre_idx`(`businessId`, `recipientUserId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssignmentNotification` ADD CONSTRAINT `AssignmentNotification_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignmentNotification` ADD CONSTRAINT `AssignmentNotification_recipientUserId_fkey` FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignmentNotification` ADD CONSTRAINT `AssignmentNotification_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `ScheduledGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

