-- Rename User.role → platformRole and ADMIN → SITE_ADMIN (authorization split).
ALTER TABLE `User` MODIFY COLUMN `role` ENUM('USER', 'ADMIN', 'AFFILIATE', 'SITE_ADMIN') NOT NULL DEFAULT 'USER';
UPDATE `User` SET `role` = 'SITE_ADMIN' WHERE `role` = 'ADMIN';
ALTER TABLE `User` CHANGE `role` `platformRole` ENUM('USER', 'SITE_ADMIN', 'AFFILIATE') NOT NULL DEFAULT 'USER';
