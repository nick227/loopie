-- AlterTable
ALTER TABLE `PlatformAffiliateClass` ADD COLUMN `defaultSlot` VARCHAR(191) NULL;

-- Backfill: any row already flagged isDefault=true (should be at most one) claims the slot.
UPDATE `PlatformAffiliateClass` SET `defaultSlot` = 'DEFAULT' WHERE `isDefault` = true;

-- CreateIndex
CREATE UNIQUE INDEX `PlatformAffiliateClass_defaultSlot_key` ON `PlatformAffiliateClass`(`defaultSlot`);
