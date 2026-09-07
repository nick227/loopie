-- Schema-drift catch-up: schema.prisma accumulated the admin support-session,
-- business licensing, audit log, platform-affiliate/payout, membership-payment, and
-- house-ad models across several commits (2026-09-05/06) with no migration ever
-- generated for any of it, so production never got them despite the app code already
-- depending on them (discovered via `Session.supportSessionId` breaking every login).
-- Generated via `prisma migrate diff --from-url <prod> --to-schema-datamodel schema.prisma`.

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `supportSessionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AdminSupportSession` (
    `id` VARCHAR(191) NOT NULL,
    `siteAdminUserId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,

    INDEX `AdminSupportSession_siteAdminUserId_idx`(`siteAdminUserId`),
    INDEX `AdminSupportSession_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessLicense` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsAt` DATETIME(3) NULL,
    `source` ENUM('MANUAL', 'PROMO', 'STRIPE') NOT NULL DEFAULT 'MANUAL',
    `grantedByUserId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusinessLicense_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `actorPlatformRole` ENUM('USER', 'SITE_ADMIN', 'AFFILIATE') NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `metadata` JSON NOT NULL,
    `supportSessionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `AuditEvent_createdAt_idx`(`createdAt`),
    INDEX `AuditEvent_supportSessionId_idx`(`supportSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAffiliateClass` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `defaultDealId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformAffiliateClass_defaultDealId_key`(`defaultDealId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAffiliateDeal` (
    `id` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `commissionRuleType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `affiliateRateBps` INTEGER NULL,
    `managerShareBps` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAffiliate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `affiliateRateOverrideBps` INTEGER NULL,
    `managerShareOverrideBps` INTEGER NULL,
    `stripeConnectAccountId` VARCHAR(191) NULL,
    `stripePayoutsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PlatformAffiliate_referralCode_key`(`referralCode`),
    UNIQUE INDEX `PlatformAffiliate_userId_key`(`userId`),
    UNIQUE INDEX `PlatformAffiliate_stripeConnectAccountId_key`(`stripeConnectAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessAffiliateAttribution` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `affiliateDealId` VARCHAR(191) NOT NULL,
    `affiliateRateBps` INTEGER NOT NULL,
    `managerAffiliateId` VARCHAR(191) NULL,
    `managerShareBps` INTEGER NULL,
    `attributedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BusinessAffiliateAttribution_businessId_key`(`businessId`),
    INDEX `BusinessAffiliateAttribution_affiliateId_idx`(`affiliateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipPayment` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `stripeInvoiceId` VARCHAR(191) NULL,
    `stripeChargeId` VARCHAR(191) NULL,
    `settledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MembershipPayment_stripeInvoiceId_key`(`stripeInvoiceId`),
    UNIQUE INDEX `MembershipPayment_stripeChargeId_key`(`stripeChargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAffiliateEarning` (
    `id` VARCHAR(191) NOT NULL,
    `membershipPaymentId` VARCHAR(191) NOT NULL,
    `beneficiaryAffiliateId` VARCHAR(191) NOT NULL,
    `sourceAffiliateId` VARCHAR(191) NOT NULL,
    `type` ENUM('DIRECT', 'MANAGER_OVERRIDE') NOT NULL,
    `baseAmountMinor` INTEGER NOT NULL,
    `rateBps` INTEGER NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAYABLE', 'PAID', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `payoutId` VARCHAR(191) NULL,
    `reversesEarningId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PlatformAffiliateEarning_reversesEarningId_key`(`reversesEarningId`),
    INDEX `PlatformAffiliateEarning_beneficiaryAffiliateId_status_idx`(`beneficiaryAffiliateId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformAffiliatePayout` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `totalAmountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'TRANSFERRED', 'PAID', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `stripeTransferId` VARCHAR(191) NULL,
    `stripePayoutId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PlatformAffiliatePayout_stripeTransferId_key`(`stripeTransferId`),
    UNIQUE INDEX `PlatformAffiliatePayout_stripePayoutId_key`(`stripePayoutId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseAd` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('WORDPRESS_EMBED', 'INTERNAL') NOT NULL,
    `advertisementId` VARCHAR(191) NULL,
    `scriptUrl` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `targetUrl` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HouseAd_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseAdPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `houseAdId` VARCHAR(191) NOT NULL,
    `zone` ENUM('HOUSE_AD') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HouseAdPlacement_zone_idx`(`zone`),
    UNIQUE INDEX `HouseAdPlacement_houseAdId_zone_key`(`houseAdId`, `zone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseAdMetric` (
    `id` VARCHAR(191) NOT NULL,
    `houseAdId` VARCHAR(191) NOT NULL,
    `zone` ENUM('HOUSE_AD') NOT NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,

    UNIQUE INDEX `HouseAdMetric_houseAdId_zone_date_key`(`houseAdId`, `zone`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Session_supportSessionId_idx` ON `Session`(`supportSessionId`);

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_supportSessionId_fkey` FOREIGN KEY (`supportSessionId`) REFERENCES `AdminSupportSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminSupportSession` ADD CONSTRAINT `AdminSupportSession_siteAdminUserId_fkey` FOREIGN KEY (`siteAdminUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminSupportSession` ADD CONSTRAINT `AdminSupportSession_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessLicense` ADD CONSTRAINT `BusinessLicense_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_supportSessionId_fkey` FOREIGN KEY (`supportSessionId`) REFERENCES `AdminSupportSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateClass` ADD CONSTRAINT `PlatformAffiliateClass_defaultDealId_fkey` FOREIGN KEY (`defaultDealId`) REFERENCES `PlatformAffiliateDeal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateDeal` ADD CONSTRAINT `PlatformAffiliateDeal_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `PlatformAffiliateClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliate` ADD CONSTRAINT `PlatformAffiliate_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `PlatformAffiliateClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliate` ADD CONSTRAINT `PlatformAffiliate_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `PlatformAffiliateDeal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliate` ADD CONSTRAINT `PlatformAffiliate_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliate` ADD CONSTRAINT `PlatformAffiliate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAffiliateAttribution` ADD CONSTRAINT `BusinessAffiliateAttribution_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAffiliateAttribution` ADD CONSTRAINT `BusinessAffiliateAttribution_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAffiliateAttribution` ADD CONSTRAINT `BusinessAffiliateAttribution_affiliateDealId_fkey` FOREIGN KEY (`affiliateDealId`) REFERENCES `PlatformAffiliateDeal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAffiliateAttribution` ADD CONSTRAINT `BusinessAffiliateAttribution_managerAffiliateId_fkey` FOREIGN KEY (`managerAffiliateId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipPayment` ADD CONSTRAINT `MembershipPayment_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateEarning` ADD CONSTRAINT `PlatformAffiliateEarning_membershipPaymentId_fkey` FOREIGN KEY (`membershipPaymentId`) REFERENCES `MembershipPayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateEarning` ADD CONSTRAINT `PlatformAffiliateEarning_beneficiaryAffiliateId_fkey` FOREIGN KEY (`beneficiaryAffiliateId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateEarning` ADD CONSTRAINT `PlatformAffiliateEarning_sourceAffiliateId_fkey` FOREIGN KEY (`sourceAffiliateId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateEarning` ADD CONSTRAINT `PlatformAffiliateEarning_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `PlatformAffiliatePayout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliateEarning` ADD CONSTRAINT `PlatformAffiliateEarning_reversesEarningId_fkey` FOREIGN KEY (`reversesEarningId`) REFERENCES `PlatformAffiliateEarning`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformAffiliatePayout` ADD CONSTRAINT `PlatformAffiliatePayout_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `PlatformAffiliate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseAd` ADD CONSTRAINT `HouseAd_advertisementId_fkey` FOREIGN KEY (`advertisementId`) REFERENCES `Advertisement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseAd` ADD CONSTRAINT `HouseAd_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseAdPlacement` ADD CONSTRAINT `HouseAdPlacement_houseAdId_fkey` FOREIGN KEY (`houseAdId`) REFERENCES `HouseAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseAdMetric` ADD CONSTRAINT `HouseAdMetric_houseAdId_fkey` FOREIGN KEY (`houseAdId`) REFERENCES `HouseAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

