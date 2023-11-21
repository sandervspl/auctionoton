CREATE TABLE `auctions` (
	`scanId` integer NOT NULL,
	`itemId` text NOT NULL,
	`ts` text DEFAULT CURRENT_TIMESTAMP,
	`seller` text NOT NULL,
	`timeLeft` integer NOT NULL,
	`itemCount` integer NOT NULL,
	`minBid` integer NOT NULL,
	`buyout` integer NOT NULL,
	`curBid` integer NOT NULL,
	FOREIGN KEY (`scanId`) REFERENCES `scanmeta`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`shortid` integer NOT NULL,
	`name` text NOT NULL,
	`SellPrice` integer NOT NULL,
	`StackCount` integer NOT NULL,
	`ClassID` integer NOT NULL,
	`SubClassID` integer NOT NULL,
	`Rarity` integer NOT NULL,
	`MinLevel` integer NOT NULL,
	`Link` text NOT NULL,
	`OLink` text NOT NULL,
	`ts` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `scanmeta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`realm` text NOT NULL,
	`faction` text NOT NULL,
	`scanner` text NOT NULL,
	`ts` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `buyoutidx` ON `auctions` (`buyout`);--> statement-breakpoint
CREATE INDEX `itemididx` ON `auctions` (`itemId`);--> statement-breakpoint
CREATE INDEX `nameidx` ON `items` (`name`);--> statement-breakpoint
CREATE INDEX `rarityidx` ON `items` (`Rarity`);--> statement-breakpoint
CREATE INDEX `sellpriceidx` ON `items` (`SellPrice`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_scan` ON `scanmeta` (`ts`,`scanner`);