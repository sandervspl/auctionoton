DROP INDEX IF EXISTS `nameidx`;--> statement-breakpoint
DROP INDEX IF EXISTS `rarityidx`;--> statement-breakpoint
DROP INDEX IF EXISTS `sellpriceidx`;--> statement-breakpoint
CREATE INDEX `items_id_idx` ON `items` (`id`);--> statement-breakpoint
CREATE INDEX `items_shortid_idx` ON `items` (`shortid`);