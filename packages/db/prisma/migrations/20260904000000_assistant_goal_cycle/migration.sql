-- Assistant business-consultant pass (2026-09-04): durable venture-taxonomy/goal knowledge on
-- Business, plus the AssistantGoalCycle state machine (Learn -> Act -> Review -> Grow) and its
-- link back into ScheduledGoal so a playbook's steps are queryable as a batch.

-- 1) Durable business knowledge (freeform Json, same convention as socialProfiles/businessTypes).
ALTER TABLE `Business` ADD COLUMN `knowledge` JSON NULL;

-- 2) New ScheduledGoalSource value for playbook-scheduled steps.
ALTER TABLE `ScheduledGoal` MODIFY `source` ENUM(
  'IDEA_TEMPLATE',
  'USER_CREATED',
  'CRM_NEXT_ACTION',
  'WORKFLOW',
  'ASSISTANT_PLAYBOOK'
) NOT NULL;

-- 3) Link ScheduledGoal rows back to the Assistant goal cycle that scheduled them.
ALTER TABLE `ScheduledGoal` ADD COLUMN `assistantGoalCycleId` VARCHAR(191) NULL;
CREATE INDEX `ScheduledGoal_assistantGoalCycleId_idx` ON `ScheduledGoal`(`assistantGoalCycleId`);

-- 4) AssistantGoalCycle.
CREATE TABLE `AssistantGoalCycle` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `goal` VARCHAR(191) NOT NULL,
    `playbookKey` VARCHAR(191) NULL,
    `phase` ENUM('LEARN', 'ACT', 'REVIEW', 'GROW') NOT NULL DEFAULT 'LEARN',
    `reviewOutcome` ENUM('WORKING', 'PARTIALLY_WORKING', 'NOT_WORKING', 'NOT_ENOUGH_DATA', 'NOT_EXECUTED') NULL,
    `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `lastSignalKey` VARCHAR(191) NULL,
    `lastSignalDismissedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actStartedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssistantGoalCycle_businessId_status_idx`(`businessId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssistantGoalCycle` ADD CONSTRAINT `AssistantGoalCycle_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledGoal` ADD CONSTRAINT `ScheduledGoal_assistantGoalCycleId_fkey` FOREIGN KEY (`assistantGoalCycleId`) REFERENCES `AssistantGoalCycle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
