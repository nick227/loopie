-- AlterTable
ALTER TABLE `AttributionEvent` ADD COLUMN `embedDeploymentId` VARCHAR(191) NULL,
    ADD COLUMN `embedInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `embedVersionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `sourceEmbedDeploymentId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedVersionId` VARCHAR(191) NULL,
    MODIFY `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT', 'EMBED_PAGE', 'EMBED_AD') NOT NULL;

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `sourceEmbedDeploymentId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedVersionId` VARCHAR(191) NULL,
    MODIFY `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT', 'EMBED_PAGE', 'EMBED_AD') NOT NULL;

-- AlterTable
ALTER TABLE `Interaction` ADD COLUMN `sourceEmbedDeploymentId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `sourceEmbedVersionId` VARCHAR(191) NULL,
    MODIFY `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT', 'EMBED_PAGE', 'EMBED_AD') NULL;

-- AlterTable
ALTER TABLE `LandingPage` ADD COLUMN `layoutConfig` JSON NULL;

-- AlterTable
ALTER TABLE `PublishedPageVersion` ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `formatVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    ADD COLUMN `layoutConfig` JSON NULL,
    ADD COLUMN `successBehavior` JSON NULL;

-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `embedDeploymentId` VARCHAR(191) NULL,
    ADD COLUMN `embedInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `embedVersionId` VARCHAR(191) NULL,
    ADD COLUMN `upstreamClickId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PublishedAdvertisementVersion` (
    `id` VARCHAR(191) NOT NULL,
    `advertisementId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `creativeSnapshot` JSON NOT NULL,
    `assetIds` JSON NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `dimensions` VARCHAR(191) NULL,
    `accessibleLabel` VARCHAR(191) NULL,
    `formatVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `checksum` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedBy` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NULL,

    INDEX `PublishedAdvertisementVersion_advertisementId_idx`(`advertisementId`),
    UNIQUE INDEX `PublishedAdvertisementVersion_advertisementId_version_key`(`advertisementId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedDeployment` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `objectType` ENUM('PAGE', 'ADVERTISEMENT') NOT NULL,
    `landingPageId` VARCHAR(191) NULL,
    `advertisementId` VARCHAR(191) NULL,
    `activePageVersionId` VARCHAR(191) NULL,
    `activeAdvertisementVersionId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'UNPUBLISHED') NOT NULL DEFAULT 'ACTIVE',
    `domainPolicy` ENUM('ANY', 'ALLOWLIST') NOT NULL DEFAULT 'ANY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmbedDeployment_publicId_key`(`publicId`),
    INDEX `EmbedDeployment_landingPageId_idx`(`landingPageId`),
    INDEX `EmbedDeployment_advertisementId_idx`(`advertisementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedAllowedOrigin` (
    `id` VARCHAR(191) NOT NULL,
    `embedDeploymentId` VARCHAR(191) NOT NULL,
    `normalizedOrigin` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmbedAllowedOrigin_embedDeploymentId_idx`(`embedDeploymentId`),
    UNIQUE INDEX `EmbedAllowedOrigin_embedDeploymentId_normalizedOrigin_key`(`embedDeploymentId`, `normalizedOrigin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedInstance` (
    `id` VARCHAR(191) NOT NULL,
    `objectType` ENUM('PAGE', 'ADVERTISEMENT') NOT NULL,
    `objectId` VARCHAR(191) NOT NULL,
    `embedDeploymentId` VARCHAR(191) NOT NULL,
    `versionId` VARCHAR(191) NOT NULL,
    `snapshotChecksum` VARCHAR(191) NOT NULL,
    `authorizedOrigin` VARCHAR(191) NOT NULL,
    `attributionSessionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmbedInstance_embedDeploymentId_idx`(`embedDeploymentId`),
    INDEX `EmbedInstance_attributionSessionId_idx`(`attributionSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedEvent` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `protocolVersion` VARCHAR(191) NULL,
    `objectType` ENUM('PAGE', 'ADVERTISEMENT') NOT NULL,
    `objectId` VARCHAR(191) NOT NULL,
    `embedDeploymentId` VARCHAR(191) NOT NULL,
    `versionId` VARCHAR(191) NOT NULL,
    `embedInstanceId` VARCHAR(191) NOT NULL,
    `snapshotChecksum` VARCHAR(191) NOT NULL,
    `authorizedOrigin` VARCHAR(191) NOT NULL,
    `hostUrl` TEXT NULL,
    `referrer` TEXT NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,
    `attributionSessionId` VARCHAR(191) NULL,
    `upstreamClickId` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmbedEvent_idempotencyKey_key`(`idempotencyKey`),
    INDEX `EmbedEvent_embedDeploymentId_idx`(`embedDeploymentId`),
    INDEX `EmbedEvent_embedInstanceId_idx`(`embedInstanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedBootstrapNonce` (
    `nonce` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`nonce`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmbedProjectionOutbox` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `formSubmissionId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmbedProjectionOutbox_formSubmissionId_key`(`formSubmissionId`),
    UNIQUE INDEX `EmbedProjectionOutbox_idempotencyKey_key`(`idempotencyKey`),
    INDEX `EmbedProjectionOutbox_businessId_status_nextAttemptAt_idx`(`businessId`, `status`, `nextAttemptAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PublishedAdvertisementVersion` ADD CONSTRAINT `PublishedAdvertisementVersion_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedDeployment` ADD CONSTRAINT `EmbedDeployment_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedDeployment` ADD CONSTRAINT `EmbedDeployment_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedDeployment` ADD CONSTRAINT `EmbedDeployment_activePageVersionId_fkey` FOREIGN KEY (`activePageVersionId`) REFERENCES `PublishedPageVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedDeployment` ADD CONSTRAINT `EmbedDeployment_activeAdvertisementVersionId_fkey` FOREIGN KEY (`activeAdvertisementVersionId`) REFERENCES `PublishedAdvertisementVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedAllowedOrigin` ADD CONSTRAINT `EmbedAllowedOrigin_embedDeploymentId_fkey` FOREIGN KEY (`embedDeploymentId`) REFERENCES `EmbedDeployment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedInstance` ADD CONSTRAINT `EmbedInstance_embedDeploymentId_fkey` FOREIGN KEY (`embedDeploymentId`) REFERENCES `EmbedDeployment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedEvent` ADD CONSTRAINT `EmbedEvent_embedDeploymentId_fkey` FOREIGN KEY (`embedDeploymentId`) REFERENCES `EmbedDeployment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedEvent` ADD CONSTRAINT `EmbedEvent_embedInstanceId_fkey` FOREIGN KEY (`embedInstanceId`) REFERENCES `EmbedInstance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedProjectionOutbox` ADD CONSTRAINT `EmbedProjectionOutbox_formSubmissionId_fkey` FOREIGN KEY (`formSubmissionId`) REFERENCES `FormSubmission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

