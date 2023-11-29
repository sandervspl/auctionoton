DROP INDEX IF EXISTS `buyoutidx`;--> statement-breakpoint
DROP INDEX IF EXISTS `itemididx`;--> statement-breakpoint
DROP INDEX IF EXISTS `scan_item_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `itemsvalues_itemid_realm_idx`;--> statement-breakpoint
CREATE INDEX `items_values_item_shortid_realm_faction_idx` ON `items_values` (`item_shortid`,`realm`,`faction`);