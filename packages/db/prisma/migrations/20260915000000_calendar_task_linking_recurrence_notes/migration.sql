-- AlterTable
ALTER TABLE `GoalIdeaTemplate` MODIFY `subjectType` ENUM('GENERAL', 'CRM', 'ADVERTISEMENT', 'PAGE', 'RIVER', 'BUSINESS', 'MESSAGE') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `ScheduledGoal` ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `recurrenceEndDate` DATETIME(3) NULL,
    ADD COLUMN `recurrenceGroupId` VARCHAR(191) NULL,
    ADD COLUMN `recurrenceRule` ENUM('DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY') NULL,
    MODIFY `subjectType` ENUM('GENERAL', 'CRM', 'ADVERTISEMENT', 'PAGE', 'RIVER', 'BUSINESS', 'MESSAGE') NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX `ScheduledGoal_recurrenceGroupId_idx` ON `ScheduledGoal`(`recurrenceGroupId`);
