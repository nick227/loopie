-- LeadStage: NEW/CONTACTED/ENGAGED/QUALIFIED/PROPOSAL/WON/LOST
--        -> NEW/UNDECIDED/INTERESTED/CLOSED/NOT_INTERESTED
-- Plus activity flags on Lead (emailed/called/texted/webinar/meeting/followUp/proposalSent).

-- 1) Expand enum so both old and new values are legal during remapping.
ALTER TABLE `Lead` MODIFY `stage` ENUM(
  'NEW',
  'CONTACTED',
  'ENGAGED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
  'UNDECIDED',
  'INTERESTED',
  'CLOSED',
  'NOT_INTERESTED'
) NOT NULL DEFAULT 'NEW';

-- 2) Remap rows (CONTACTED was "we reached them" — that's activity now, not status).
UPDATE `Lead` SET `stage` = 'UNDECIDED' WHERE `stage` = 'CONTACTED';
UPDATE `Lead` SET `stage` = 'INTERESTED' WHERE `stage` IN ('ENGAGED', 'QUALIFIED', 'PROPOSAL');
UPDATE `Lead` SET `stage` = 'CLOSED' WHERE `stage` = 'WON';
UPDATE `Lead` SET `stage` = 'NOT_INTERESTED' WHERE `stage` = 'LOST';

-- 3) Drop old enum values.
ALTER TABLE `Lead` MODIFY `stage` ENUM(
  'NEW',
  'UNDECIDED',
  'INTERESTED',
  'CLOSED',
  'NOT_INTERESTED'
) NOT NULL DEFAULT 'NEW';

-- 4) Activity checkboxes (default false; auto-hooks flip them going forward).
ALTER TABLE `Lead`
  ADD COLUMN `emailed` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `called` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `texted` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `webinar` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `meeting` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `followUp` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `proposalSent` BOOLEAN NOT NULL DEFAULT false;
