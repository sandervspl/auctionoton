ALTER TABLE "items" DROP CONSTRAINT "items_item_id_auction_house_id_unq";--> statement-breakpoint
DROP INDEX IF EXISTS "items_item_id_auction_house_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_item_id_auction_house_id_ts_idx" ON "items" ("item_id","auction_house_id","timestamp");