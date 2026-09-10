-- Pages Phase 0 + Phase 1 (2026-09-10) — see docs/strategy/pages-page-types-and-style-axes-roadmap.md
-- and docs/strategy/pages-and-ads-shared-catalog-boundary.md.
--
-- Generated via `prisma migrate diff --from-schema-datamodel <pre-change schema.prisma>
-- --to-schema-datamodel packages/db/prisma/schema.prisma --script`, not `prisma migrate dev`,
-- because this local dev database already has 18 earlier migrations applied via `db push` but not
-- recorded in `_prisma_migrations` (a pre-existing, separate gap — see CLAUDE.md's Google
-- Sheets/migration-validation entries). This file was verified by applying the equivalent schema
-- via `prisma db push` against both `loopie` (431 real LandingPage rows, zero data loss, verified
-- by row count before/after) and `loopie_test`, not by running this exact SQL — the two are
-- schema-equivalent (`prisma db push` and `migrate diff --script` both compile from the same
-- schema.prisma), but only the db push path has actually been exercised against real data.
-- Wholly additive: two new columns (one defaulted, one nullable) and five new tables. Nothing
-- existing is altered, dropped, or renamed.
-- AlterTable
ALTER TABLE `LandingPageTemplate` ADD COLUMN `pageType` ENUM('HOME', 'LANDING', 'STUDIO', 'EMAIL_CAPTURE', 'STORE', 'EVENT') NOT NULL DEFAULT 'LANDING';

-- AlterTable
ALTER TABLE `LandingPage` ADD COLUMN `enabledCapabilities` JSON NULL;

-- CreateTable
CREATE TABLE `Capability` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Capability_key_key`(`key`),
    INDEX `Capability_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Genre` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Genre_key_key`(`key`),
    INDEX `Genre_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageTypeCapability` (
    `id` VARCHAR(191) NOT NULL,
    `pageType` ENUM('HOME', 'LANDING', 'STUDIO', 'EMAIL_CAPTURE', 'STORE', 'EVENT') NOT NULL,
    `capabilityId` VARCHAR(191) NOT NULL,
    `requirementLevel` ENUM('REQUIRED', 'RECOMMENDED', 'ALLOWED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PageTypeCapability_capabilityId_idx`(`capabilityId`),
    UNIQUE INDEX `PageTypeCapability_pageType_capabilityId_key`(`pageType`, `capabilityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageLayoutCapability` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageTemplateId` VARCHAR(191) NOT NULL,
    `capabilityId` VARCHAR(191) NOT NULL,
    `supportLevel` ENUM('REQUIRED', 'SUPPORTED', 'UNSUPPORTED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PageLayoutCapability_capabilityId_idx`(`capabilityId`),
    UNIQUE INDEX `PageLayoutCapability_landingPageTemplateId_capabilityId_key`(`landingPageTemplateId`, `capabilityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageLayoutSlotSupport` (
    `id` VARCHAR(191) NOT NULL,
    `landingPageTemplateId` VARCHAR(191) NOT NULL,
    `slotGroup` VARCHAR(191) NOT NULL,
    `supportLevel` ENUM('REQUIRED', 'SUPPORTED', 'UNSUPPORTED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageLayoutSlotSupport_landingPageTemplateId_slotGroup_key`(`landingPageTemplateId`, `slotGroup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `LandingPageTemplate_pageType_idx` ON `LandingPageTemplate`(`pageType`);

-- AddForeignKey
ALTER TABLE `PageTypeCapability` ADD CONSTRAINT `PageTypeCapability_capabilityId_fkey` FOREIGN KEY (`capabilityId`) REFERENCES `Capability`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageLayoutCapability` ADD CONSTRAINT `PageLayoutCapability_landingPageTemplateId_fkey` FOREIGN KEY (`landingPageTemplateId`) REFERENCES `LandingPageTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageLayoutCapability` ADD CONSTRAINT `PageLayoutCapability_capabilityId_fkey` FOREIGN KEY (`capabilityId`) REFERENCES `Capability`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageLayoutSlotSupport` ADD CONSTRAINT `PageLayoutSlotSupport_landingPageTemplateId_fkey` FOREIGN KEY (`landingPageTemplateId`) REFERENCES `LandingPageTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
