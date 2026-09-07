ALTER TABLE `User` ADD COLUMN `siteInboxEmailNotifications` BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE `SiteInquiry` (
  `id` VARCHAR(191) NOT NULL,
  `submissionKey` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `message` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SiteInquiry_submissionKey_key` (`submissionKey`),
  INDEX `SiteInquiry_createdAt_id_idx` (`createdAt`, `id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
