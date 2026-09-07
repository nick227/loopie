-- AlterTable
ALTER TABLE `BusinessAffiliateAttribution`
  ADD COLUMN `status` ENUM('ACTIVE', 'INVALIDATED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `invalidatedAt` DATETIME(3) NULL,
  ADD COLUMN `invalidatedReason` VARCHAR(191) NULL,
  ADD COLUMN `affiliateUserIdSnapshot` VARCHAR(191) NULL,
  ADD COLUMN `managerUserIdSnapshot` VARCHAR(191) NULL,
  ADD COLUMN `lockedAfterPaymentAt` DATETIME(3) NULL;

-- Backfill: any existing row is treated as approved now, snapshotted from its current affiliate/
-- manager links, and locked if the business has already been billed.
UPDATE `BusinessAffiliateAttribution` a
  LEFT JOIN `PlatformAffiliate` pa ON pa.id = a.affiliateId
  LEFT JOIN `PlatformAffiliate` pm ON pm.id = a.managerAffiliateId
  SET a.affiliateUserIdSnapshot = pa.userId,
      a.managerUserIdSnapshot = pm.userId,
      a.approvedAt = a.attributedAt;

UPDATE `BusinessAffiliateAttribution` a
  SET a.lockedAfterPaymentAt = (
    SELECT MIN(mp.settledAt) FROM `MembershipPayment` mp WHERE mp.businessId = a.businessId
  )
  WHERE EXISTS (SELECT 1 FROM `MembershipPayment` mp WHERE mp.businessId = a.businessId);
