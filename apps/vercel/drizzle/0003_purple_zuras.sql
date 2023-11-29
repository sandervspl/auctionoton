ALTER TABLE `items_values` RENAME COLUMN `server` TO `realm`;--> statement-breakpoint
DROP INDEX IF EXISTS `itemsvalues_itemid_server_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `itemsvalues_itemshortid_timestamp_server_unique`;--> statement-breakpoint
ALTER TABLE items_values ADD `faction` text NOT NULL;--> statement-breakpoint
CREATE INDEX `itemsvalues_itemid_realm_idx` ON `items_values` (`item_shortid`,`realm`);--> statement-breakpoint
CREATE UNIQUE INDEX `itemsvalues_itemshortid_timestamp_realm_faction_unique` ON `items_values` (`item_shortid`,`ts`,`realm`,`faction`);