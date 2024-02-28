CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auction_house_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`pet_species_id` integer,
	`min_buyout` integer NOT NULL,
	`quantity` integer NOT NULL,
	`market_value` integer NOT NULL,
	`historical` integer NOT NULL,
	`num_auctions` integer NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `items_metadata` (
	`id` integer NOT NULL,
	`name` text DEFAULT '',
	`slug` text DEFAULT '',
	`locale` text DEFAULT 'en_US',
	`quality` integer DEFAULT 1,
	`tags` text DEFAULT '',
	`item_level` integer DEFAULT 0,
	`required_level` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `items_item_id_auction_house_id_idx` ON `items` (`item_id`,`auction_house_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_item_id_auction_house_id_unq` ON `items` (`item_id`,`auction_house_id`);--> statement-breakpoint
CREATE INDEX `items_metadata_id_idx` ON `items_metadata` (`id`);--> statement-breakpoint
CREATE INDEX `items_metadata_id_locale_idx` ON `items_metadata` (`id`,`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_metadata_id_unq` ON `items_metadata` (`id`);