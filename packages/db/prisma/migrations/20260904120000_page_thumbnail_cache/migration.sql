-- Derived screenshot cache for landing-page list previews (and later layout/community thumbs).
-- Not source of truth — keyed by version checksum / systemKey and regeneratable anytime.
CREATE TABLE `PageThumbnail` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('PUBLISHED_VERSION', 'SYSTEM_LAYOUT', 'COMMUNITY_TEMPLATE') NOT NULL,
    `publishedVersionId` VARCHAR(191) NULL,
    `systemKey` VARCHAR(191) NULL,
    `communityVersionId` VARCHAR(191) NULL,
    `sourceChecksum` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `lastError` TEXT NULL,
    `widthPx` INTEGER NULL,
    `heightPx` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageThumbnail_publishedVersionId_key`(`publishedVersionId`),
    UNIQUE INDEX `PageThumbnail_systemKey_key`(`systemKey`),
    UNIQUE INDEX `PageThumbnail_communityVersionId_key`(`communityVersionId`),
    INDEX `PageThumbnail_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PageThumbnail` ADD CONSTRAINT `PageThumbnail_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `PublishedPageVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
