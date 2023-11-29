CREATE TABLE `items_values` (
	`id` text PRIMARY KEY NOT NULL,
	`item_shortid` text NOT NULL,
	`min_buyout` integer NOT NULL,
	`market_value` integer NOT NULL,
	`historical_value` integer NOT NULL,
	`num_auctions` integer NOT NULL,
	`quantity` integer NOT NULL,
	`ts` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`item_shortid`) REFERENCES `items`(`shortid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `itemsvalues_itemid_idx` ON `items_values` (`item_shortid`);--> statement-breakpoint
CREATE UNIQUE INDEX `itemsvalues_itemshortid_timestamp_unique` ON `items_values` (`item_shortid`,`ts`);