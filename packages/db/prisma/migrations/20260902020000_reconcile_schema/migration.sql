-- AlterTable
ALTER TABLE `Advertisement` ADD COLUMN `ctaLabel` VARCHAR(191) NULL,
    ADD COLUMN `destinationUrl` VARCHAR(191) NULL,
    ADD COLUMN `primaryText` TEXT NULL;

-- AlterTable
ALTER TABLE `Business` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `galleryImageUrls` JSON NULL,
    ADD COLUMN `hours` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `pinnedRiverPostId` VARCHAR(191) NULL,
    ADD COLUMN `slug` VARCHAR(191) NULL,
    ADD COLUMN `tagline` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Contact` DROP COLUMN `tags`,
    ADD COLUMN `avatarAssetId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `EmbedBootstrapNonce` ADD COLUMN `deploymentId` VARCHAR(191) NOT NULL,
    ADD COLUMN `origin` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `EmbedProjectionOutbox` ADD COLUMN `embedEventId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `FormField` ADD COLUMN `defaultValue` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Interaction` ADD COLUMN `channel` ENUM('EMAIL', 'TEXT', 'SOCIAL', 'CALL', 'MEETING', 'WEBINAR', 'EVENT', 'FORM', 'REFERRAL') NULL,
    ADD COLUMN `providerId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('EMAIL_SENT', 'TEXT_SENT', 'SOCIAL_POST_SENT', 'REPLY', 'CALL_LOGGED', 'NOTE', 'STATUS_CHANGE', 'QUOTE_SENT', 'SALE_RECORDED', 'AD_CLICK', 'FORM_SUBMITTED', 'PAGE_VIEWED', 'MEETING', 'WEBINAR', 'EVENT', 'FOLLOW_UP') NOT NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `nextActionAt` DATETIME(3) NULL,
    ADD COLUMN `nextActionNote` TEXT NULL,
    MODIFY `stage` ENUM('NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST') NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE `PublishedAdvertisementVersion` DROP COLUMN `destination`,
    ADD COLUMN `clickBehavior` ENUM('NONE', 'URL', 'HOST') NOT NULL DEFAULT 'HOST',
    ADD COLUMN `destinationUrl` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ContactTag` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactTag_businessId_idx`(`businessId`),
    UNIQUE INDEX `ContactTag_businessId_normalizedName_key`(`businessId`, `normalizedName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactTagAssignment` (
    `contactId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactTagAssignment_tagId_idx`(`tagId`),
    PRIMARY KEY (`contactId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactNote` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `pinnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ContactNote_contactId_pinnedAt_createdAt_idx`(`contactId`, `pinnedAt`, `createdAt`),
    INDEX `ContactNote_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelProvider` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'TEXT', 'SOCIAL', 'CALL', 'MEETING', 'WEBINAR', 'EVENT', 'FORM', 'REFERRAL') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,

    INDEX `ChannelProvider_businessId_channel_idx`(`businessId`, `channel`),
    UNIQUE INDEX `ChannelProvider_businessId_channel_normalizedName_key`(`businessId`, `channel`, `normalizedName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiverPost` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'AD', 'PAGE') NOT NULL,
    `body` TEXT NOT NULL,
    `advertisementId` VARCHAR(191) NULL,
    `publishedAdvertisementVersionId` VARCHAR(191) NULL,
    `landingPageId` VARCHAR(191) NULL,
    `publishedPageVersionId` VARCHAR(191) NULL,
    `imageAssetIds` JSON NULL,
    `videoAssetId` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `linkPreviewTitle` VARCHAR(191) NULL,
    `linkPreviewDescription` TEXT NULL,
    `linkPreviewImageUrl` VARCHAR(191) NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `ctaUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `RiverPost_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `RiverPost_deletedAt_createdAt_idx`(`deletedAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiverEngagementEvent` (
    `id` VARCHAR(191) NOT NULL,
    `riverPostId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMPRESSION', 'CLICK', 'PROFILE_VISIT') NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `actorBusinessId` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RiverEngagementEvent_riverPostId_type_idx`(`riverPostId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiverReaction` (
    `id` VARCHAR(191) NOT NULL,
    `riverPostId` VARCHAR(191) NOT NULL,
    `actorBusinessId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RiverReaction_riverPostId_idx`(`riverPostId`),
    UNIQUE INDEX `RiverReaction_riverPostId_actorBusinessId_key`(`riverPostId`, `actorBusinessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiverFollow` (
    `id` VARCHAR(191) NOT NULL,
    `followerBusinessId` VARCHAR(191) NOT NULL,
    `followedBusinessId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RiverFollow_followedBusinessId_idx`(`followedBusinessId`),
    UNIQUE INDEX `RiverFollow_followerBusinessId_followedBusinessId_key`(`followerBusinessId`, `followedBusinessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiverComment` (
    `id` VARCHAR(191) NOT NULL,
    `riverPostId` VARCHAR(191) NOT NULL,
    `actorBusinessId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `parentCommentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `RiverComment_riverPostId_parentCommentId_createdAt_idx`(`riverPostId`, `parentCommentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalIdeaTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `title` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `ideaType` ENUM('ACTION', 'OUTCOME', 'MAINTENANCE', 'CREATION', 'RELATIONSHIP', 'EXPERIMENT', 'REVIEW') NOT NULL DEFAULT 'ACTION',
    `subjectType` ENUM('GENERAL', 'CRM', 'ADVERTISEMENT', 'PAGE', 'RIVER', 'BUSINESS') NOT NULL DEFAULT 'GENERAL',
    `stage` ENUM('FOUNDATION', 'ATTRACT', 'CAPTURE', 'CONVERT', 'GROW') NOT NULL DEFAULT 'FOUNDATION',
    `requiresTemplateIds` JSON NULL,
    `actionType` VARCHAR(191) NULL,
    `actionTarget` VARCHAR(191) NULL,
    `actionLabel` VARCHAR(191) NULL,
    `businessTypes` JSON NULL,
    `defaultHorizon` VARCHAR(191) NULL,
    `defaultEstimateMinutes` INTEGER NULL,
    `trackingType` ENUM('MANUAL', 'ENTITY_STATE', 'COUNT') NOT NULL DEFAULT 'MANUAL',
    `metricKey` VARCHAR(191) NULL,
    `targetValue` INTEGER NULL,
    `priorityWeight` INTEGER NOT NULL DEFAULT 0,
    `seasonality` VARCHAR(191) NULL,
    `contentVersion` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GoalIdeaTemplate_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalIdeaState` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `dismissedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GoalIdeaState_businessId_templateId_key`(`businessId`, `templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledGoal` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `actionType` VARCHAR(191) NULL,
    `actionTarget` VARCHAR(191) NULL,
    `actionLabel` VARCHAR(191) NULL,
    `source` ENUM('IDEA_TEMPLATE', 'USER_CREATED', 'CRM_NEXT_ACTION', 'WORKFLOW') NOT NULL,
    `sourceTemplateId` VARCHAR(191) NULL,
    `externalKey` VARCHAR(191) NULL,
    `subjectType` ENUM('GENERAL', 'CRM', 'ADVERTISEMENT', 'PAGE', 'RIVER', 'BUSINESS') NOT NULL DEFAULT 'GENERAL',
    `subjectId` VARCHAR(191) NULL,
    `trackingType` ENUM('MANUAL', 'ENTITY_STATE', 'COUNT') NOT NULL DEFAULT 'MANUAL',
    `metricKey` VARCHAR(191) NULL,
    `targetValue` INTEGER NULL,
    `currentValue` INTEGER NULL,
    `estimateMinutes` INTEGER NULL,
    `scheduledFor` DATETIME(3) NULL,
    `hasTime` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `dismissedAt` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'DONE', 'DISMISSED') NOT NULL DEFAULT 'SCHEDULED',
    `reminderSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScheduledGoal_businessId_status_scheduledFor_idx`(`businessId`, `status`, `scheduledFor`),
    INDEX `ScheduledGoal_subjectType_subjectId_idx`(`subjectType`, `subjectId`),
    INDEX `ScheduledGoal_sourceTemplateId_idx`(`sourceTemplateId`),
    UNIQUE INDEX `ScheduledGoal_businessId_externalKey_key`(`businessId`, `externalKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalEvent` (
    `id` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'DISMISSED', 'REMINDER_SENT', 'PROGRESS_UPDATED') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    INDEX `GoalEvent_goalId_occurredAt_idx`(`goalId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Business_slug_key` ON `Business`(`slug`);

-- CreateIndex
CREATE UNIQUE INDEX `Business_pinnedRiverPostId_key` ON `Business`(`pinnedRiverPostId`);

-- CreateIndex
CREATE INDEX `Contact_avatarAssetId_idx` ON `Contact`(`avatarAssetId`);

-- CreateIndex
CREATE UNIQUE INDEX `EmbedProjectionOutbox_embedEventId_key` ON `EmbedProjectionOutbox`(`embedEventId`);

-- CreateIndex
CREATE UNIQUE INDEX `FormSubmission_idempotencyKey_key` ON `FormSubmission`(`idempotencyKey`);

-- CreateIndex
CREATE INDEX `Interaction_providerId_idx` ON `Interaction`(`providerId`);

-- AddForeignKey
ALTER TABLE `Business` ADD CONSTRAINT `Business_pinnedRiverPostId_fkey` FOREIGN KEY (`pinnedRiverPostId`) REFERENCES `RiverPost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_avatarAssetId_fkey` FOREIGN KEY (`avatarAssetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactTag` ADD CONSTRAINT `ContactTag_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactTagAssignment` ADD CONSTRAINT `ContactTagAssignment_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactTagAssignment` ADD CONSTRAINT `ContactTagAssignment_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `ContactTag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactNote` ADD CONSTRAINT `ContactNote_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactNote` ADD CONSTRAINT `ContactNote_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelProvider` ADD CONSTRAINT `ChannelProvider_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ChannelProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverPost` ADD CONSTRAINT `RiverPost_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverPost` ADD CONSTRAINT `RiverPost_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverPost` ADD CONSTRAINT `RiverPost_publishedAdvertisementVersionId_fkey` FOREIGN KEY (`publishedAdvertisementVersionId`) REFERENCES `PublishedAdvertisementVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverPost` ADD CONSTRAINT `RiverPost_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverPost` ADD CONSTRAINT `RiverPost_publishedPageVersionId_fkey` FOREIGN KEY (`publishedPageVersionId`) REFERENCES `PublishedPageVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverEngagementEvent` ADD CONSTRAINT `RiverEngagementEvent_riverPostId_fkey` FOREIGN KEY (`riverPostId`) REFERENCES `RiverPost`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverReaction` ADD CONSTRAINT `RiverReaction_riverPostId_fkey` FOREIGN KEY (`riverPostId`) REFERENCES `RiverPost`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverReaction` ADD CONSTRAINT `RiverReaction_actorBusinessId_fkey` FOREIGN KEY (`actorBusinessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverFollow` ADD CONSTRAINT `RiverFollow_followerBusinessId_fkey` FOREIGN KEY (`followerBusinessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverFollow` ADD CONSTRAINT `RiverFollow_followedBusinessId_fkey` FOREIGN KEY (`followedBusinessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverComment` ADD CONSTRAINT `RiverComment_riverPostId_fkey` FOREIGN KEY (`riverPostId`) REFERENCES `RiverPost`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverComment` ADD CONSTRAINT `RiverComment_actorBusinessId_fkey` FOREIGN KEY (`actorBusinessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiverComment` ADD CONSTRAINT `RiverComment_parentCommentId_fkey` FOREIGN KEY (`parentCommentId`) REFERENCES `RiverComment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbedProjectionOutbox` ADD CONSTRAINT `EmbedProjectionOutbox_embedEventId_fkey` FOREIGN KEY (`embedEventId`) REFERENCES `EmbedEvent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalIdeaTemplate` ADD CONSTRAINT `GoalIdeaTemplate_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalIdeaState` ADD CONSTRAINT `GoalIdeaState_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalIdeaState` ADD CONSTRAINT `GoalIdeaState_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `GoalIdeaTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledGoal` ADD CONSTRAINT `ScheduledGoal_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledGoal` ADD CONSTRAINT `ScheduledGoal_sourceTemplateId_fkey` FOREIGN KEY (`sourceTemplateId`) REFERENCES `GoalIdeaTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalEvent` ADD CONSTRAINT `GoalEvent_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `ScheduledGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
