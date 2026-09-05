-- Google Sheets CRM integration: a new CrmProvider value plus generic per-provider selection
-- state (spreadsheetId/spreadsheetName/sheetTab/columnMapping) that doesn't fit Integration's
-- fixed columns. Named generically (providerConfig, not googleSheetsConfig) so a future
-- file/sheet-shaped connector can reuse it.
ALTER TABLE `Integration` MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'GOOGLE_SHEETS', 'CSV') NOT NULL;
ALTER TABLE `ExternalContactRecord` MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'GOOGLE_SHEETS', 'CSV') NOT NULL;
ALTER TABLE `ExternalEvent` MODIFY `provider` ENUM('HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'WOOCOMMERCE', 'WEBHOOK', 'SQUARE', 'PIPEDRIVE', 'GOOGLE_SHEETS', 'CSV') NOT NULL;

ALTER TABLE `Integration` ADD COLUMN `providerConfig` JSON NULL;
