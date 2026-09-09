-- AlterTable
ALTER TABLE `GoalEvent` MODIFY `type` ENUM('CREATED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'DISMISSED', 'REMINDER_SENT', 'PROGRESS_UPDATED', 'REASSIGNED') NOT NULL;

-- AlterTable
ALTER TABLE `ScheduledGoal` ADD COLUMN `assignedToUserId` VARCHAR(191) NULL,
    ADD COLUMN `createdByUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ScheduledGoal_businessId_assignedToUserId_idx` ON `ScheduledGoal`(`businessId`, `assignedToUserId`);

-- AddForeignKey
ALTER TABLE `ScheduledGoal` ADD CONSTRAINT `ScheduledGoal_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledGoal` ADD CONSTRAINT `ScheduledGoal_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
