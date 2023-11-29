DROP INDEX IF EXISTS `auctions_scanid_itemid_buyout_idx`;--> statement-breakpoint
ALTER TABLE realms ADD `version` text DEFAULT 'classic';--> statement-breakpoint
CREATE UNIQUE INDEX `auctions_scanid_itemid_idx` ON `auctions` (`scanId`,`itemId`);