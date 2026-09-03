-- CreateTable
CREATE TABLE `ActivityItem` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `sourceKind` ENUM('LOOPIE', 'PLATFORM', 'WEBSITE', 'CHANNEL', 'USER', 'AUTOMATION') NOT NULL,
    `sourceRecordType` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(191) NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `taxonomyVersion` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `observedAt` DATETIME(3) NOT NULL,
    `projectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` VARCHAR(191) NOT NULL,
    `sourceLabel` VARCHAR(191) NOT NULL,
    `sourceAccountId` VARCHAR(191) NULL,
    `actorKind` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorLabel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `attention` ENUM('INFORMATION', 'ACTION_REQUIRED', 'FAILURE') NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `personId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `adId` VARCHAR(191) NULL,
    `runId` VARCHAR(191) NULL,
    `pageId` VARCHAR(191) NULL,
    `formId` VARCHAR(191) NULL,
    `messageId` VARCHAR(191) NULL,
    `broadcastId` VARCHAR(191) NULL,
    `saleId` VARCHAR(191) NULL,
    `aggregation` JSON NULL,
    `actions` JSON NULL,

    INDEX `ActivityItem_businessId_attention_idx`(`businessId` ASC, `attention` ASC),
    INDEX `ActivityItem_businessId_messageId_idx`(`businessId` ASC, `messageId` ASC),
    INDEX `ActivityItem_businessId_occurredAt_idx`(`businessId` ASC, `occurredAt` ASC),
    INDEX `ActivityItem_businessId_personId_idx`(`businessId` ASC, `personId` ASC),
    INDEX `ActivityItem_businessId_runId_idx`(`businessId` ASC, `runId` ASC),
    INDEX `ActivityItem_businessId_sourceKind_idx`(`businessId` ASC, `sourceKind` ASC),
    UNIQUE INDEX `ActivityItem_businessId_sourceKind_sourceRecordType_sourceRe_key`(`businessId` ASC, `sourceKind` ASC, `sourceRecordType` ASC, `sourceRecordId` ASC, `eventKey` ASC),
    INDEX `ActivityItem_businessId_type_idx`(`businessId` ASC, `type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityProjectionFailure` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `sourceRecordType` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(191) NOT NULL,
    `error` TEXT NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityProjectionFailure_businessId_resolvedAt_idx`(`businessId` ASC, `resolvedAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivitySavedView` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `filters` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivitySavedView_businessId_userId_idx`(`businessId` ASC, `userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivitySeenState` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `seenAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ActivitySeenState_userId_businessId_key`(`userId` ASC, `businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdRun` (
    `id` VARCHAR(191) NOT NULL,
    `advertisementId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NOT NULL,
    `placement` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'READY', 'ACTIVE', 'PAUSED', 'ENDED', 'VALIDATION_FAILED', 'PROVISIONING_FAILED') NOT NULL DEFAULT 'PENDING',
    `budget` DECIMAL(12, 2) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `externalCampaignId` VARCHAR(191) NULL,
    `externalAdSetId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `previewUrl` VARCHAR(191) NULL,
    `managerUrl` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `spend` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `reach` INTEGER NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `providerState` ENUM('NOT_SENT', 'DRAFT_SENT', 'UNDER_REVIEW', 'ELIGIBLE', 'LIVE', 'PAUSED', 'LIMITED', 'REJECTED', 'ENDED', 'UNKNOWN') NULL,
    `providerStateRaw` VARCHAR(191) NULL,
    `syncHealth` ENUM('CURRENT', 'DELAYED', 'FAILED', 'DISCONNECTED', 'NEVER_SYNCED') NOT NULL DEFAULT 'NEVER_SYNCED',
    `syncError` VARCHAR(191) NULL,
    `effectiveBudget` DECIMAL(12, 2) NULL,
    `effectiveStartDate` DATETIME(3) NULL,
    `effectiveEndDate` DATETIME(3) NULL,
    `country` VARCHAR(191) NULL,
    `locationNote` VARCHAR(191) NULL,
    `radiusMiles` INTEGER NULL,
    `effectiveCountry` VARCHAR(191) NULL,
    `effectiveLocationNote` VARCHAR(191) NULL,
    `effectiveRadiusMiles` INTEGER NULL,
    `providerIssues` JSON NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `destinationLandingPageId` VARCHAR(191) NULL,
    `orderSnapshot` JSON NULL,
    `supersedesRunId` VARCHAR(191) NULL,
    `mediaOrderRevisionId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdRun_advertisementId_idempotencyKey_key`(`advertisementId` ASC, `idempotencyKey` ASC),
    INDEX `AdRun_advertisementId_idx`(`advertisementId` ASC),
    INDEX `AdRun_destinationLandingPageId_idx`(`destinationLandingPageId` ASC),
    INDEX `AdRun_mediaOrderRevisionId_idx`(`mediaOrderRevisionId` ASC),
    INDEX `AdRun_supersedesRunId_idx`(`supersedesRunId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdSpend` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `budgetAuthorizationId` VARCHAR(191) NULL,
    `deploymentId` VARCHAR(191) NULL,
    `adUnitId` VARCHAR(191) NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NOT NULL,
    `externalChargeId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `reportedAmountMinor` INTEGER NOT NULL,
    `settledAmountMinor` INTEGER NOT NULL DEFAULT 0,
    `settlementStatus` ENUM('REPORTED', 'RECONCILED', 'SETTLED', 'DISPUTED') NOT NULL DEFAULT 'REPORTED',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NULL,
    `settlementTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adRunId` VARCHAR(191) NULL,

    INDEX `AdSpend_adRunId_fkey`(`adRunId` ASC),
    INDEX `AdSpend_adUnitId_idx`(`adUnitId` ASC),
    INDEX `AdSpend_budgetAuthorizationId_fkey`(`budgetAuthorizationId` ASC),
    INDEX `AdSpend_businessId_adRunId_idx`(`businessId` ASC, `adRunId` ASC),
    INDEX `AdSpend_businessId_campaignId_idx`(`businessId` ASC, `campaignId` ASC),
    UNIQUE INDEX `AdSpend_businessId_externalChargeId_key`(`businessId` ASC, `externalChargeId` ASC),
    UNIQUE INDEX `AdSpend_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `AdSpend_campaignId_fkey`(`campaignId` ASC),
    INDEX `AdSpend_deploymentId_idx`(`deploymentId` ASC),
    INDEX `AdSpend_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    INDEX `AdSpend_settlementTransactionId_idx`(`settlementTransactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdUnit` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `creativeId` VARCHAR(191) NOT NULL,
    `format` ENUM('DISPLAY_BANNER', 'NATIVE', 'EMBED') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `destinationLandingPageId` VARCHAR(191) NULL,
    `destinationUrl` VARCHAR(191) NULL,
    `servingConfig` JSON NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `lastServedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdUnit_businessId_idx`(`businessId` ASC),
    INDEX `AdUnit_campaignId_idx`(`campaignId` ASC),
    INDEX `AdUnit_creativeId_idx`(`creativeId` ASC),
    INDEX `AdUnit_destinationLandingPageId_idx`(`destinationLandingPageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Advertisement` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Advertisement_businessId_idx`(`businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdvertisementAsset` (
    `id` VARCHAR(191) NOT NULL,
    `advertisementId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdvertisementAsset_advertisementId_assetId_key`(`advertisementId` ASC, `assetId` ASC),
    INDEX `AdvertisementAsset_assetId_idx`(`assetId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Affiliate` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `commissionRuleType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `commissionRateBps` INTEGER NULL,
    `commissionFixedAmountMinor` INTEGER NULL,
    `eligibilityWindowDays` INTEGER NULL,
    `payoutThresholdMinor` INTEGER NULL,
    `payoutCadence` ENUM('MANUAL', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'MANUAL',
    `lastPayoutAt` DATETIME(3) NULL,
    `classId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `affiliateRateOverrideBps` INTEGER NULL,
    `managerShareOverrideBps` INTEGER NULL,
    `destinationLandingPageId` VARCHAR(191) NULL,
    `destinationUrl` VARCHAR(191) NULL,
    `stripeConnectAccountId` VARCHAR(191) NULL,
    `stripePayoutsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `stripeDetailsSubmitted` BOOLEAN NOT NULL DEFAULT false,
    `stripeDisabledReason` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `pausedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Affiliate_businessId_idx`(`businessId` ASC),
    INDEX `Affiliate_classId_idx`(`classId` ASC),
    INDEX `Affiliate_dealId_idx`(`dealId` ASC),
    INDEX `Affiliate_destinationLandingPageId_idx`(`destinationLandingPageId` ASC),
    INDEX `Affiliate_managerId_idx`(`managerId` ASC),
    UNIQUE INDEX `Affiliate_referralCode_key`(`referralCode` ASC),
    UNIQUE INDEX `Affiliate_stripeConnectAccountId_key`(`stripeConnectAccountId` ASC),
    UNIQUE INDEX `Affiliate_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AffiliateClass` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxAffiliateRateBps` INTEGER NOT NULL,
    `maxManagerShareBps` INTEGER NOT NULL,
    `defaultDealId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AffiliateClass_businessId_idx`(`businessId` ASC),
    INDEX `AffiliateClass_defaultDealId_idx`(`defaultDealId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AffiliateDeal` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `commissionRuleType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `affiliateRateBps` INTEGER NULL,
    `fixedAmountMinor` INTEGER NULL,
    `managerShareBps` INTEGER NOT NULL,
    `eligibilityWindowDays` INTEGER NULL,
    `payoutThresholdMinor` INTEGER NULL,
    `payoutCadence` ENUM('MANUAL', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'MANUAL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AffiliateDeal_businessId_idx`(`businessId` ASC),
    INDEX `AffiliateDeal_classId_idx`(`classId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AffiliateReferralClick` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NULL,
    `clickedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AffiliateReferralClick_affiliateId_idx`(`affiliateId` ASC),
    INDEX `AffiliateReferralClick_sessionId_idx`(`sessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asset` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'TEXT', 'VIDEO', 'AUDIO') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `textContent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `durationMs` INTEGER NULL,
    `heightPx` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `widthPx` INTEGER NULL,

    INDEX `Asset_businessId_type_idx`(`businessId` ASC, `type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttentionItem` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `state` ENUM('NEEDS_ACTION', 'IN_PROGRESS', 'SNOOZED', 'RESOLVED') NOT NULL DEFAULT 'NEEDS_ACTION',
    `assigneeId` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NULL,
    `dueAt` DATETIME(3) NULL,
    `snoozedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AttentionItem_activityId_key`(`activityId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `creativeId` VARCHAR(191) NULL,
    `deploymentId` VARCHAR(191) NULL,
    `adUnitId` VARCHAR(191) NULL,
    `landingPageId` VARCHAR(191) NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `clickId` VARCHAR(191) NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,
    `utmContent` VARCHAR(191) NULL,
    `utmTerm` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adRunId` VARCHAR(191) NULL,

    INDEX `AttributionEvent_adRunId_fkey`(`adRunId` ASC),
    INDEX `AttributionEvent_adUnitId_idx`(`adUnitId` ASC),
    INDEX `AttributionEvent_deploymentId_idx`(`deploymentId` ASC),
    INDEX `AttributionEvent_landingPageId_fkey`(`landingPageId` ASC),
    INDEX `AttributionEvent_sessionId_idx`(`sessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audience` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PREDEFINED', 'SAVED_FILTER', 'MANUAL_LIST', 'IMPORTED_LIST') NOT NULL,
    `filter` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Audience_businessId_idx`(`businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AudienceMember` (
    `id` VARCHAR(191) NOT NULL,
    `audienceId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AudienceMember_audienceId_contactId_key`(`audienceId` ASC, `contactId` ASC),
    INDEX `AudienceMember_contactId_idx`(`contactId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Automation` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `trigger` ENUM('MESSAGE_SENT', 'CONTACT_REPLIES', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'SALE_RECORDED', 'DATE_REACHED') NOT NULL,
    `waitDays` INTEGER NULL,
    `condition` ENUM('HAS_REPLIED', 'HAS_NOT_REPLIED', 'LEAD_STILL_OPEN', 'LEAD_REACHED_STAGE', 'CUSTOMER_STATUS', 'CHANNEL_ELIGIBILITY') NULL,
    `conditionValue` JSON NULL,
    `action` ENUM('SEND_EMAIL', 'SEND_TEXT', 'CREATE_REMINDER', 'CHANGE_LEAD_STATUS', 'NOTIFY_USER', 'STOP_SEQUENCE') NOT NULL,
    `actionTemplateId` VARCHAR(191) NULL,
    `actionValue` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `pausedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Automation_businessId_trigger_idx`(`businessId` ASC, `trigger` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationLog` (
    `id` VARCHAR(191) NOT NULL,
    `automationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `action` ENUM('SEND_EMAIL', 'SEND_TEXT', 'CREATE_REMINDER', 'CHANGE_LEAD_STATUS', 'NOTIFY_USER', 'STOP_SEQUENCE') NOT NULL,
    `outcome` ENUM('SENT', 'SKIPPED', 'FAILED') NOT NULL,
    `reasonSkipped` VARCHAR(191) NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AutomationLog_automationId_triggeredAt_idx`(`automationId` ASC, `triggeredAt` ASC),
    INDEX `AutomationLog_contactId_idx`(`contactId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationRun` (
    `id` VARCHAR(191) NOT NULL,
    `automationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NULL,
    `triggerSourceId` VARCHAR(191) NOT NULL,
    `triggerEventAt` DATETIME(3) NOT NULL,
    `runAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'EXECUTED', 'SKIPPED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AutomationRun_automationId_triggerSourceId_key`(`automationId` ASC, `triggerSourceId` ASC),
    INDEX `AutomationRun_contactId_fkey`(`contactId` ASC),
    INDEX `AutomationRun_status_runAt_idx`(`status` ASC, `runAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetAuthorization` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `currency` VARCHAR(3) NOT NULL,
    `authorizedAmountMinor` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED') NOT NULL DEFAULT 'ACTIVE',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adRunId` VARCHAR(191) NULL,

    INDEX `BudgetAuthorization_adRunId_idx`(`adRunId` ASC),
    UNIQUE INDEX `BudgetAuthorization_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `BudgetAuthorization_businessId_idx`(`businessId` ASC),
    INDEX `BudgetAuthorization_campaignId_idx`(`campaignId` ASC),
    INDEX `BudgetAuthorization_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Business` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `subscriptionStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `identityCompletedAt` DATETIME(3) NULL,
    `industry` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `socialProfiles` JSON NULL,
    `targetAudience` VARCHAR(191) NULL,

    UNIQUE INDEX `Business_stripeCustomerId_key`(`stripeCustomerId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `budget` DECIMAL(12, 2) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `destinationUrl` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `platforms` JSON NOT NULL,
    `duplicatedFromId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_businessId_status_idx`(`businessId` ASC, `status` ASC),
    INDEX `Campaign_duplicatedFromId_fkey`(`duplicatedFromId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignAdRun` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `adRunId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CampaignAdRun_adRunId_idx`(`adRunId` ASC),
    UNIQUE INDEX `CampaignAdRun_campaignId_adRunId_key`(`campaignId` ASC, `adRunId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignCreative` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `creativeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CampaignCreative_campaignId_creativeId_key`(`campaignId` ASC, `creativeId` ASC),
    INDEX `CampaignCreative_creativeId_idx`(`creativeId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Commission` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `payeeRef` VARCHAR(191) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `status` ENUM('PENDING', 'PAYABLE', 'PAID', 'CANCELLED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `sourceRef` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Commission_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Commission_businessId_status_idx`(`businessId` ASC, `status` ASC),
    INDEX `Commission_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `emailEligible` BOOLEAN NOT NULL DEFAULT true,
    `smsEligible` BOOLEAN NOT NULL DEFAULT true,
    `emailOptOutAt` DATETIME(3) NULL,
    `smsOptOutAt` DATETIME(3) NULL,
    `lastContactedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Contact_businessId_createdAt_idx`(`businessId` ASC, `createdAt` ASC),
    INDEX `Contact_businessId_email_idx`(`businessId` ASC, `email` ASC),
    UNIQUE INDEX `Contact_businessId_email_key`(`businessId` ASC, `email` ASC),
    INDEX `Contact_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `Contact_businessId_phone_key`(`businessId` ASC, `phone` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactIdentifier` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `kind` ENUM('EMAIL', 'PHONE') NOT NULL,
    `normalizedValue` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContactIdentifier_businessId_kind_normalizedValue_key`(`businessId` ASC, `kind` ASC, `normalizedValue` ASC),
    INDEX `ContactIdentifier_contactId_idx`(`contactId` ASC),
    INDEX `ContactIdentifier_integrationId_fkey`(`integrationId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Creative` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hostedUrl` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `previousVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Creative_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `Creative_previousVersionId_key`(`previousVersionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreativeAsset` (
    `id` VARCHAR(191) NOT NULL,
    `creativeId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreativeAsset_assetId_idx`(`assetId` ASC),
    UNIQUE INDEX `CreativeAsset_creativeId_assetId_key`(`creativeId` ASC, `assetId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Deployment` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `creativeId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NOT NULL,
    `externalCampaignId` VARCHAR(191) NULL,
    `externalAdSetId` VARCHAR(191) NULL,
    `externalAdId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'PENDING',
    `spend` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `lastSyncedAt` DATETIME(3) NULL,
    `destinationLandingPageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Deployment_campaignId_idx`(`campaignId` ASC),
    INDEX `Deployment_creativeId_idx`(`creativeId` ASC),
    INDEX `Deployment_destinationLandingPageId_idx`(`destinationLandingPageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalContactRecord` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `integrationId` VARCHAR(191) NULL,
    `importJobId` VARCHAR(191) NULL,
    `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `scopeKey` VARCHAR(191) NOT NULL,
    `matchStatus` ENUM('LINKED', 'UNMATCHED', 'AMBIGUOUS') NOT NULL DEFAULT 'LINKED',
    `candidateContactIds` JSON NULL,
    `externalUpdatedAt` DATETIME(3) NULL,
    `syncedAt` DATETIME(3) NULL,
    `raw` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExternalContactRecord_businessId_matchStatus_idx`(`businessId` ASC, `matchStatus` ASC),
    INDEX `ExternalContactRecord_contactId_idx`(`contactId` ASC),
    INDEX `ExternalContactRecord_importJobId_fkey`(`importJobId` ASC),
    INDEX `ExternalContactRecord_integrationId_fkey`(`integrationId` ASC),
    UNIQUE INDEX `ExternalContactRecord_scopeKey_externalId_key`(`scopeKey` ASC, `externalId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalEvent` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `saleId` VARCHAR(191) NULL,
    `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL,
    `type` ENUM('CONTACT_CREATED', 'CONTACT_UPDATED', 'DEAL_WON', 'ORDER_CREATED', 'PAYMENT_COMPLETED', 'APPOINTMENT_COMPLETED', 'CUSTOMER_TAGGED') NOT NULL,
    `externalEventId` VARCHAR(191) NOT NULL,
    `scopeKey` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExternalEvent_businessId_type_idx`(`businessId` ASC, `type` ASC),
    INDEX `ExternalEvent_contactId_idx`(`contactId` ASC),
    INDEX `ExternalEvent_integrationId_fkey`(`integrationId` ASC),
    INDEX `ExternalEvent_saleId_fkey`(`saleId` ASC),
    UNIQUE INDEX `ExternalEvent_scopeKey_externalEventId_key`(`scopeKey` ASC, `externalEventId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialAccount` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `kind` ENUM('CLIENT_AD_FUNDS', 'CLIENT_FUNDS_RESERVED', 'LOOPIE_CASH', 'PROCESSOR_CLEARING', 'AD_PLATFORM_CLEARING', 'LOOPIE_REVENUE', 'AFFILIATE_PAYABLE', 'REFUNDS_CREDITS') NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FinancialAccount_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `FinancialAccount_businessId_kind_currency_key`(`businessId` ASC, `kind` ASC, `currency` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Form` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `submitLabel` VARCHAR(191) NOT NULL DEFAULT 'Submit',
    `successMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Form_businessId_idx`(`businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormField` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'EMAIL', 'PHONE', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'HIDDEN') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `options` JSON NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FormField_formId_fieldKey_key`(`formId` ASC, `fieldKey` ASC),
    INDEX `FormField_formId_idx`(`formId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NULL,
    `publishedPageVersionId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `data` JSON NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `clickId` VARCHAR(191) NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,
    `utmContent` VARCHAR(191) NULL,
    `utmTerm` VARCHAR(191) NULL,
    `sourceDeploymentId` VARCHAR(191) NULL,
    `sourceAdUnitId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceAdRunId` VARCHAR(191) NULL,

    INDEX `FormSubmission_businessId_createdAt_idx`(`businessId` ASC, `createdAt` ASC),
    INDEX `FormSubmission_contactId_fkey`(`contactId` ASC),
    INDEX `FormSubmission_formId_idx`(`formId` ASC),
    UNIQUE INDEX `FormSubmission_landingPageId_sessionId_key`(`landingPageId` ASC, `sessionId` ASC),
    INDEX `FormSubmission_leadId_fkey`(`leadId` ASC),
    INDEX `FormSubmission_publishedPageVersionId_fkey`(`publishedPageVersionId` ASC),
    INDEX `FormSubmission_sessionId_idx`(`sessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportJob` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    `created` INTEGER NOT NULL DEFAULT 0,
    `linked` INTEGER NOT NULL DEFAULT 0,
    `ambiguous` INTEGER NOT NULL DEFAULT 0,
    `skipped` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportJob_businessId_createdAt_idx`(`businessId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboxMessage` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `kind` ENUM('SYSTEM', 'EMAIL', 'SMS') NOT NULL DEFAULT 'SYSTEM',
    `direction` ENUM('INBOUND', 'OUTBOUND', 'INTERNAL') NOT NULL DEFAULT 'INTERNAL',
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InboxMessage_threadId_idx`(`threadId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InboxThread` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `type` ENUM('CONTACT', 'ADVERTISEMENT', 'PAGE', 'INTEGRATION', 'SYSTEM') NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `advertisementId` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NULL,
    `landingPageId` VARCHAR(191) NULL,
    `integrationPlatform` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `lastReadAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InboxThread_advertisementId_platform_key`(`advertisementId` ASC, `platform` ASC),
    INDEX `InboxThread_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `InboxThread_businessId_integrationPlatform_key`(`businessId` ASC, `integrationPlatform` ASC),
    UNIQUE INDEX `InboxThread_contactId_key`(`contactId` ASC),
    UNIQUE INDEX `InboxThread_landingPageId_key`(`landingPageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Integration` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'SQUARE', 'PIPEDRIVE', 'CSV') NOT NULL,
    `label` VARCHAR(191) NULL,
    `externalAccountId` VARCHAR(191) NULL,
    `status` ENUM('INCOMPLETE', 'CONNECTED', 'NEEDS_REAUTH', 'PAUSED') NOT NULL DEFAULT 'INCOMPLETE',
    `syncDirection` ENUM('INBOUND') NOT NULL DEFAULT 'INBOUND',
    `lastSyncAt` DATETIME(3) NULL,
    `syncCursor` VARCHAR(191) NULL,
    `capabilities` JSON NOT NULL,
    `credentialsEnc` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Integration_businessId_provider_externalAccountId_key`(`businessId` ASC, `provider` ASC, `externalAccountId` ASC),
    INDEX `Integration_businessId_provider_idx`(`businessId` ASC, `provider` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interaction` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `type` ENUM('EMAIL_SENT', 'TEXT_SENT', 'SOCIAL_POST_SENT', 'REPLY', 'CALL_LOGGED', 'NOTE', 'STATUS_CHANGE', 'QUOTE_SENT', 'SALE_RECORDED', 'AD_CLICK', 'FORM_SUBMITTED', 'PAGE_VIEWED') NOT NULL,
    `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT') NULL,
    `sourceMessageId` VARCHAR(191) NULL,
    `sourceDeploymentId` VARCHAR(191) NULL,
    `sourceAdUnitId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceAdRunId` VARCHAR(191) NULL,

    INDEX `Interaction_businessId_occurredAt_idx`(`businessId` ASC, `occurredAt` ASC),
    INDEX `Interaction_contactId_occurredAt_idx`(`contactId` ASC, `occurredAt` ASC),
    INDEX `Interaction_sourceAdRunId_fkey`(`sourceAdRunId` ASC),
    INDEX `Interaction_sourceAdUnitId_fkey`(`sourceAdUnitId` ASC),
    INDEX `Interaction_sourceDeploymentId_fkey`(`sourceDeploymentId` ASC),
    INDEX `Interaction_sourceMessageId_fkey`(`sourceMessageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingPage` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `customDomain` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `content` JSON NOT NULL,
    `theme` JSON NULL,
    `publishedVersionId` VARCHAR(191) NULL,
    `formStartCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `slugAutoManaged` BOOLEAN NOT NULL DEFAULT true,

    INDEX `LandingPage_businessId_status_idx`(`businessId` ASC, `status` ASC),
    INDEX `LandingPage_formId_fkey`(`formId` ASC),
    UNIQUE INDEX `LandingPage_publishedVersionId_key`(`publishedVersionId` ASC),
    UNIQUE INDEX `LandingPage_slug_key`(`slug` ASC),
    INDEX `LandingPage_templateId_fkey`(`templateId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingPageAdSlot` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `placement` ENUM('AFTER_HERO', 'BEFORE_FORM', 'AFTER_FORM', 'BOTTOM') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LandingPageAdSlot_landingPageId_idx`(`landingPageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingPageAdSlotAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `slotId` VARCHAR(191) NOT NULL,
    `adRunId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'READY', 'ACTIVE', 'PAUSED', 'ENDED', 'VALIDATION_FAILED', 'PROVISIONING_FAILED') NOT NULL DEFAULT 'ACTIVE',
    `weight` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LandingPageAdSlotAssignment_adRunId_idx`(`adRunId` ASC),
    INDEX `LandingPageAdSlotAssignment_slotId_idx`(`slotId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandingPageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `formatVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `previewImageUrl` VARCHAR(191) NULL,
    `schema` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LandingPageTemplate_businessId_idx`(`businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `stage` ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
    `owner` VARCHAR(191) NULL,
    `estimatedValue` DECIMAL(12, 2) NULL,
    `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT') NOT NULL,
    `sourceMessageId` VARCHAR(191) NULL,
    `sourceDeploymentId` VARCHAR(191) NULL,
    `sourceAdUnitId` VARCHAR(191) NULL,
    `clickId` VARCHAR(191) NULL,
    `landingSessionId` VARCHAR(191) NULL,
    `referringAffiliateId` VARCHAR(191) NULL,
    `openSlot` VARCHAR(191) NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceAdRunId` VARCHAR(191) NULL,

    INDEX `Lead_businessId_stage_idx`(`businessId` ASC, `stage` ASC),
    INDEX `Lead_contactId_idx`(`contactId` ASC),
    UNIQUE INDEX `Lead_contactId_openSlot_key`(`contactId` ASC, `openSlot` ASC),
    INDEX `Lead_sourceAdRunId_idx`(`sourceAdRunId` ASC),
    INDEX `Lead_sourceAdUnitId_idx`(`sourceAdUnitId` ASC),
    INDEX `Lead_sourceDeploymentId_idx`(`sourceDeploymentId` ASC),
    INDEX `Lead_sourceMessageId_idx`(`sourceMessageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `direction` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adRunId` VARCHAR(191) NULL,

    INDEX `LedgerEntry_accountId_fkey`(`accountId` ASC),
    INDEX `LedgerEntry_adRunId_idx`(`adRunId` ASC),
    INDEX `LedgerEntry_businessId_accountId_idx`(`businessId` ASC, `accountId` ASC),
    INDEX `LedgerEntry_campaignId_idx`(`campaignId` ASC),
    INDEX `LedgerEntry_transactionId_idx`(`transactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `type` ENUM('CLIENT_FUNDING', 'CREDIT', 'REFUND', 'REVERSAL', 'BUDGET_RESERVE', 'AD_SPEND', 'AD_SPEND_SETTLEMENT', 'LOOPIE_FEE', 'SERVICE_PAYMENT', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT') NOT NULL,
    `status` ENUM('POSTED') NOT NULL DEFAULT 'POSTED',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `externalRef` VARCHAR(191) NULL,
    `externalProvider` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `reversesTransactionId` VARCHAR(191) NULL,
    `postedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerTransaction_businessId_externalRef_idx`(`businessId` ASC, `externalRef` ASC),
    UNIQUE INDEX `LedgerTransaction_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `LedgerTransaction_businessId_postedAt_idx`(`businessId` ASC, `postedAt` ASC),
    UNIQUE INDEX `LedgerTransaction_reversesTransactionId_key`(`reversesTransactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoopieSession` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `firstAdRunId` VARCHAR(191) NULL,
    `firstDeploymentId` VARCHAR(191) NULL,
    `firstSourceType` VARCHAR(191) NULL,
    `platformClickIds` JSON NULL,
    `utms` JSON NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LoopieSession_businessId_lastSeenAt_idx`(`businessId` ASC, `lastSeenAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaOrderRevision` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `advertisementId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NOT NULL,
    `placement` VARCHAR(191) NULL,
    `revision` INTEGER NOT NULL,
    `goal` VARCHAR(191) NOT NULL,
    `successEvent` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `locationNote` VARCHAR(191) NULL,
    `radiusMiles` INTEGER NULL,
    `dailyBudgetMinor` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `destinationLandingPageId` VARCHAR(191) NULL,
    `destinationLandingPageVersionId` VARCHAR(191) NULL,
    `assetIds` JSON NOT NULL,
    `accountName` VARCHAR(191) NULL,
    `accountCurrency` VARCHAR(191) NULL,
    `accountTimezone` VARCHAR(191) NULL,
    `adAccountId` VARCHAR(191) NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MediaOrderRevision_advertisementId_idx`(`advertisementId` ASC),
    UNIQUE INDEX `MediaOrderRevision_advertisementId_platform_placement_revisi_key`(`advertisementId` ASC, `platform` ASC, `placement` ASC, `revision` ASC),
    INDEX `MediaOrderRevision_businessId_idx`(`businessId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'TEXT', 'SOCIAL') NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `audienceId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `automationId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'SENT', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Message_audienceId_fkey`(`audienceId` ASC),
    INDEX `Message_automationId_fkey`(`automationId` ASC),
    INDEX `Message_businessId_channel_idx`(`businessId` ASC, `channel` ASC),
    INDEX `Message_businessId_status_idx`(`businessId` ASC, `status` ASC),
    INDEX `Message_templateId_fkey`(`templateId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NOT NULL,
    `publishedPageVersionId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `referrer` VARCHAR(191) NULL,
    `utmSource` VARCHAR(191) NULL,
    `utmMedium` VARCHAR(191) NULL,
    `utmCampaign` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageView_landingPageId_occurredAt_idx`(`landingPageId` ASC, `occurredAt` ASC),
    INDEX `PageView_sessionId_idx`(`sessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `status` ENUM('POSTED', 'REFUNDED', 'FAILED') NOT NULL DEFAULT 'POSTED',
    `processor` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `stripeChargeId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_businessId_createdAt_idx`(`businessId` ASC, `createdAt` ASC),
    UNIQUE INDEX `Payment_businessId_externalRef_key`(`businessId` ASC, `externalRef` ASC),
    UNIQUE INDEX `Payment_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Payment_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payout` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `payeeRef` VARCHAR(191) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `status` ENUM('PENDING', 'TRANSFERRED', 'PAID', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PAID',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NULL,
    `stripeTransferId` VARCHAR(191) NULL,
    `stripePayoutId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payout_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Payout_businessId_status_idx`(`businessId` ASC, `status` ASC),
    INDEX `Payout_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    UNIQUE INDEX `Payout_stripeTransferId_key`(`stripeTransferId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayoutItem` (
    `id` VARCHAR(191) NOT NULL,
    `payoutId` VARCHAR(191) NOT NULL,
    `commissionId` VARCHAR(191) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PayoutItem_commissionId_key`(`commissionId` ASC),
    INDEX `PayoutItem_payoutId_idx`(`payoutId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerformanceSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `entityType` ENUM('MESSAGE', 'CAMPAIGN', 'CREATIVE', 'DEPLOYMENT', 'LANDING_PAGE', 'AD_UNIT') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `sentOrViews` INTEGER NOT NULL DEFAULT 0,
    `openedOrClicks` INTEGER NOT NULL DEFAULT 0,
    `replied` INTEGER NOT NULL DEFAULT 0,
    `leads` INTEGER NOT NULL DEFAULT 0,
    `sales` INTEGER NOT NULL DEFAULT 0,
    `revenue` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `spend` DECIMAL(12, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PerformanceSnapshot_businessId_entityType_idx`(`businessId` ASC, `entityType` ASC),
    UNIQUE INDEX `PerformanceSnapshot_entityType_entityId_period_key`(`entityType` ASC, `entityId` ASC, `period` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformConnection` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META', 'GOOGLE', 'TIKTOK', 'LOOPIE') NOT NULL,
    `status` ENUM('INCOMPLETE', 'CONNECTED', 'NEEDS_REAUTH') NOT NULL DEFAULT 'INCOMPLETE',
    `accessTokenEnc` TEXT NOT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `externalUserId` VARCHAR(191) NULL,
    `adAccountId` VARCHAR(191) NULL,
    `accountName` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `pageId` VARCHAR(191) NULL,
    `defaultCountry` VARCHAR(191) NOT NULL DEFAULT 'US',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlatformConnection_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `PlatformConnection_businessId_platform_key`(`businessId` ASC, `platform` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishedPageVersion` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `content` JSON NOT NULL,
    `theme` JSON NULL,
    `formId` VARCHAR(191) NULL,
    `formSnapshot` JSON NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedBy` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NULL,
    `adSlotSnapshot` JSON NULL,
    `schemaSnapshot` JSON NULL,

    INDEX `PublishedPageVersion_landingPageId_idx`(`landingPageId` ASC),
    UNIQUE INDEX `PublishedPageVersion_landingPageId_version_key`(`landingPageId` ASC, `version` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RateLimitBucket_expiresAt_idx`(`expiresAt` ASC),
    PRIMARY KEY (`key` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `adSpendId` VARCHAR(191) NULL,
    `currency` VARCHAR(3) NOT NULL,
    `trackedAmountMinor` INTEGER NOT NULL,
    `platformReportedAmountMinor` INTEGER NOT NULL,
    `settledAmountMinor` INTEGER NOT NULL,
    `discrepancyMinor` INTEGER NOT NULL,
    `status` ENUM('MATCHED', 'DISCREPANCY', 'RESOLVED') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adRunId` VARCHAR(191) NULL,

    INDEX `Reconciliation_adRunId_idx`(`adRunId` ASC),
    INDEX `Reconciliation_adSpendId_idx`(`adSpendId` ASC),
    UNIQUE INDEX `Reconciliation_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Reconciliation_businessId_idx`(`businessId` ASC),
    INDEX `Reconciliation_campaignId_idx`(`campaignId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `status` ENUM('POSTED') NOT NULL DEFAULT 'POSTED',
    `reason` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `ledgerTransactionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Refund_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Refund_businessId_idx`(`businessId` ASC),
    INDEX `Refund_ledgerTransactionId_idx`(`ledgerTransactionId` ASC),
    INDEX `Refund_paymentId_idx`(`paymentId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `productOrService` VARCHAR(191) NULL,
    `sourceType` ENUM('MESSAGE', 'DEPLOYMENT', 'AD_RUN', 'AD_UNIT', 'MANUAL', 'IMPORT') NOT NULL,
    `sourceMessageId` VARCHAR(191) NULL,
    `sourceDeploymentId` VARCHAR(191) NULL,
    `sourceAdUnitId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `reversedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `sourceAdRunId` VARCHAR(191) NULL,

    INDEX `Sale_businessId_date_idx`(`businessId` ASC, `date` ASC),
    UNIQUE INDEX `Sale_businessId_idempotencyKey_key`(`businessId` ASC, `idempotencyKey` ASC),
    INDEX `Sale_contactId_idx`(`contactId` ASC),
    INDEX `Sale_leadId_fkey`(`leadId` ASC),
    INDEX `Sale_sourceAdRunId_idx`(`sourceAdRunId` ASC),
    INDEX `Sale_sourceAdUnitId_idx`(`sourceAdUnitId` ASC),
    INDEX `Sale_sourceDeploymentId_idx`(`sourceDeploymentId` ASC),
    INDEX `Sale_sourceMessageId_idx`(`sourceMessageId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleAffiliateSplit` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `referringAffiliateId` VARCHAR(191) NOT NULL,
    `managerAffiliateId` VARCHAR(191) NULL,
    `commissionRuleType` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `grossAffiliateRateBps` INTEGER NOT NULL,
    `fixedAmountMinor` INTEGER NULL,
    `managerShareBps` INTEGER NOT NULL,
    `affiliateNetBps` INTEGER NOT NULL,
    `eligibilityWindowDays` INTEGER NULL,
    `saleAmountMinor` INTEGER NOT NULL,
    `grossCommissionMinor` INTEGER NOT NULL,
    `managerCommissionMinor` INTEGER NOT NULL,
    `affiliateCommissionMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SaleAffiliateSplit_managerAffiliateId_idx`(`managerAffiliateId` ASC),
    INDEX `SaleAffiliateSplit_referringAffiliateId_idx`(`referringAffiliateId` ASC),
    UNIQUE INDEX `SaleAffiliateSplit_saleId_key`(`saleId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Session_token_idx`(`token` ASC),
    UNIQUE INDEX `Session_token_key`(`token` ASC),
    INDEX `Session_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Template` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` ENUM('EMAIL', 'TEXT', 'SOCIAL') NOT NULL,
    `purpose` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `cta` VARCHAR(191) NULL,
    `personalizationTokens` JSON NULL,
    `suggestedAudienceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Template_businessId_channel_idx`(`businessId` ASC, `channel` ASC),
    INDEX `Template_suggestedAudienceId_fkey`(`suggestedAudienceId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateMedia` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TemplateMedia_assetId_idx`(`assetId` ASC),
    UNIQUE INDEX `TemplateMedia_templateId_assetId_key`(`templateId` ASC, `assetId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN', 'AFFILIATE') NOT NULL DEFAULT 'USER',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `suspendedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `User_businessId_idx`(`businessId` ASC),
    UNIQUE INDEX `User_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdRun` ADD CONSTRAINT `AdRun_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdRun` ADD CONSTRAINT `AdRun_destinationLandingPageId_fkey` FOREIGN KEY (`destinationLandingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdRun` ADD CONSTRAINT `AdRun_mediaOrderRevisionId_fkey` FOREIGN KEY (`mediaOrderRevisionId`) REFERENCES `MediaOrderRevision`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdRun` ADD CONSTRAINT `AdRun_supersedesRunId_fkey` FOREIGN KEY (`supersedesRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_adUnitId_fkey` FOREIGN KEY (`adUnitId`) REFERENCES `AdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_budgetAuthorizationId_fkey` FOREIGN KEY (`budgetAuthorizationId`) REFERENCES `BudgetAuthorization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_deploymentId_fkey` FOREIGN KEY (`deploymentId`) REFERENCES `Deployment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdSpend` ADD CONSTRAINT `AdSpend_settlementTransactionId_fkey` FOREIGN KEY (`settlementTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdUnit` ADD CONSTRAINT `AdUnit_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdUnit` ADD CONSTRAINT `AdUnit_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdUnit` ADD CONSTRAINT `AdUnit_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `Creative`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdUnit` ADD CONSTRAINT `AdUnit_destinationLandingPageId_fkey` FOREIGN KEY (`destinationLandingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Advertisement` ADD CONSTRAINT `Advertisement_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertisementAsset` ADD CONSTRAINT `AdvertisementAsset_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdvertisementAsset` ADD CONSTRAINT `AdvertisementAsset_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `AffiliateClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `AffiliateDeal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_destinationLandingPageId_fkey` FOREIGN KEY (`destinationLandingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Affiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Affiliate` ADD CONSTRAINT `Affiliate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateClass` ADD CONSTRAINT `AffiliateClass_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateClass` ADD CONSTRAINT `AffiliateClass_defaultDealId_fkey` FOREIGN KEY (`defaultDealId`) REFERENCES `AffiliateDeal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateDeal` ADD CONSTRAINT `AffiliateDeal_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateDeal` ADD CONSTRAINT `AffiliateDeal_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `AffiliateClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateReferralClick` ADD CONSTRAINT `AffiliateReferralClick_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttentionItem` ADD CONSTRAINT `AttentionItem_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `ActivityItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributionEvent` ADD CONSTRAINT `AttributionEvent_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributionEvent` ADD CONSTRAINT `AttributionEvent_adUnitId_fkey` FOREIGN KEY (`adUnitId`) REFERENCES `AdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributionEvent` ADD CONSTRAINT `AttributionEvent_deploymentId_fkey` FOREIGN KEY (`deploymentId`) REFERENCES `Deployment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributionEvent` ADD CONSTRAINT `AttributionEvent_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Audience` ADD CONSTRAINT `Audience_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AudienceMember` ADD CONSTRAINT `AudienceMember_audienceId_fkey` FOREIGN KEY (`audienceId`) REFERENCES `Audience`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AudienceMember` ADD CONSTRAINT `AudienceMember_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Automation` ADD CONSTRAINT `Automation_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationLog` ADD CONSTRAINT `AutomationLog_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `Automation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `Automation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAuthorization` ADD CONSTRAINT `BudgetAuthorization_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAuthorization` ADD CONSTRAINT `BudgetAuthorization_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAuthorization` ADD CONSTRAINT `BudgetAuthorization_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetAuthorization` ADD CONSTRAINT `BudgetAuthorization_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_duplicatedFromId_fkey` FOREIGN KEY (`duplicatedFromId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignAdRun` ADD CONSTRAINT `CampaignAdRun_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignAdRun` ADD CONSTRAINT `CampaignAdRun_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignCreative` ADD CONSTRAINT `CampaignCreative_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignCreative` ADD CONSTRAINT `CampaignCreative_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `Creative`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactIdentifier` ADD CONSTRAINT `ContactIdentifier_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactIdentifier` ADD CONSTRAINT `ContactIdentifier_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactIdentifier` ADD CONSTRAINT `ContactIdentifier_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Creative` ADD CONSTRAINT `Creative_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Creative` ADD CONSTRAINT `Creative_previousVersionId_fkey` FOREIGN KEY (`previousVersionId`) REFERENCES `Creative`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreativeAsset` ADD CONSTRAINT `CreativeAsset_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreativeAsset` ADD CONSTRAINT `CreativeAsset_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `Creative`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deployment` ADD CONSTRAINT `Deployment_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deployment` ADD CONSTRAINT `Deployment_creativeId_fkey` FOREIGN KEY (`creativeId`) REFERENCES `Creative`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deployment` ADD CONSTRAINT `Deployment_destinationLandingPageId_fkey` FOREIGN KEY (`destinationLandingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalContactRecord` ADD CONSTRAINT `ExternalContactRecord_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalContactRecord` ADD CONSTRAINT `ExternalContactRecord_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalContactRecord` ADD CONSTRAINT `ExternalContactRecord_importJobId_fkey` FOREIGN KEY (`importJobId`) REFERENCES `ImportJob`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalContactRecord` ADD CONSTRAINT `ExternalContactRecord_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvent` ADD CONSTRAINT `ExternalEvent_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvent` ADD CONSTRAINT `ExternalEvent_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvent` ADD CONSTRAINT `ExternalEvent_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvent` ADD CONSTRAINT `ExternalEvent_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialAccount` ADD CONSTRAINT `FinancialAccount_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Form` ADD CONSTRAINT `Form_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormField` ADD CONSTRAINT `FormField_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_publishedPageVersionId_fkey` FOREIGN KEY (`publishedPageVersionId`) REFERENCES `PublishedPageVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxMessage` ADD CONSTRAINT `InboxMessage_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `InboxThread`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxThread` ADD CONSTRAINT `InboxThread_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxThread` ADD CONSTRAINT `InboxThread_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxThread` ADD CONSTRAINT `InboxThread_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InboxThread` ADD CONSTRAINT `InboxThread_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Integration` ADD CONSTRAINT `Integration_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_sourceAdRunId_fkey` FOREIGN KEY (`sourceAdRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_sourceAdUnitId_fkey` FOREIGN KEY (`sourceAdUnitId`) REFERENCES `AdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_sourceDeploymentId_fkey` FOREIGN KEY (`sourceDeploymentId`) REFERENCES `Deployment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaction` ADD CONSTRAINT `Interaction_sourceMessageId_fkey` FOREIGN KEY (`sourceMessageId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPage` ADD CONSTRAINT `LandingPage_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPage` ADD CONSTRAINT `LandingPage_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPage` ADD CONSTRAINT `LandingPage_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `PublishedPageVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPage` ADD CONSTRAINT `LandingPage_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `LandingPageTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPageAdSlot` ADD CONSTRAINT `LandingPageAdSlot_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPageAdSlotAssignment` ADD CONSTRAINT `LandingPageAdSlotAssignment_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPageAdSlotAssignment` ADD CONSTRAINT `LandingPageAdSlotAssignment_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `LandingPageAdSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandingPageTemplate` ADD CONSTRAINT `LandingPageTemplate_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceAdRunId_fkey` FOREIGN KEY (`sourceAdRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceAdUnitId_fkey` FOREIGN KEY (`sourceAdUnitId`) REFERENCES `AdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceDeploymentId_fkey` FOREIGN KEY (`sourceDeploymentId`) REFERENCES `Deployment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceMessageId_fkey` FOREIGN KEY (`sourceMessageId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `FinancialAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerTransaction` ADD CONSTRAINT `LedgerTransaction_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerTransaction` ADD CONSTRAINT `LedgerTransaction_reversesTransactionId_fkey` FOREIGN KEY (`reversesTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoopieSession` ADD CONSTRAINT `LoopieSession_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaOrderRevision` ADD CONSTRAINT `MediaOrderRevision_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaOrderRevision` ADD CONSTRAINT `MediaOrderRevision_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_audienceId_fkey` FOREIGN KEY (`audienceId`) REFERENCES `Audience`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `Automation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageView` ADD CONSTRAINT `PageView_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutItem` ADD CONSTRAINT `PayoutItem_commissionId_fkey` FOREIGN KEY (`commissionId`) REFERENCES `Commission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayoutItem` ADD CONSTRAINT `PayoutItem_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `Payout`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformConnection` ADD CONSTRAINT `PlatformConnection_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PublishedPageVersion` ADD CONSTRAINT `PublishedPageVersion_landingPageId_fkey` FOREIGN KEY (`landingPageId`) REFERENCES `LandingPage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconciliation` ADD CONSTRAINT `Reconciliation_adRunId_fkey` FOREIGN KEY (`adRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconciliation` ADD CONSTRAINT `Reconciliation_adSpendId_fkey` FOREIGN KEY (`adSpendId`) REFERENCES `AdSpend`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconciliation` ADD CONSTRAINT `Reconciliation_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reconciliation` ADD CONSTRAINT `Reconciliation_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_ledgerTransactionId_fkey` FOREIGN KEY (`ledgerTransactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_sourceAdRunId_fkey` FOREIGN KEY (`sourceAdRunId`) REFERENCES `AdRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_sourceAdUnitId_fkey` FOREIGN KEY (`sourceAdUnitId`) REFERENCES `AdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_sourceDeploymentId_fkey` FOREIGN KEY (`sourceDeploymentId`) REFERENCES `Deployment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_sourceMessageId_fkey` FOREIGN KEY (`sourceMessageId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleAffiliateSplit` ADD CONSTRAINT `SaleAffiliateSplit_managerAffiliateId_fkey` FOREIGN KEY (`managerAffiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleAffiliateSplit` ADD CONSTRAINT `SaleAffiliateSplit_referringAffiliateId_fkey` FOREIGN KEY (`referringAffiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleAffiliateSplit` ADD CONSTRAINT `SaleAffiliateSplit_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Template` ADD CONSTRAINT `Template_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Template` ADD CONSTRAINT `Template_suggestedAudienceId_fkey` FOREIGN KEY (`suggestedAudienceId`) REFERENCES `Audience`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateMedia` ADD CONSTRAINT `TemplateMedia_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateMedia` ADD CONSTRAINT `TemplateMedia_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
