ALTER TABLE "items_metadata" DROP CONSTRAINT "items_metadata_id_unq";--> statement-breakpoint
DROP INDEX IF EXISTS "items_item_id_auction_house_id_ts_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "items_metadata_id_locale_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "recent_searches_timestamp_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_item_id_idx" ON "items" ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_item_id_auction_house_id_idx" ON "items" ("item_id","auction_house_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_auction_house_id_ts_idx" ON "items" ("auction_house_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_metadata_name_idx" ON "items_metadata" ("name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_section_items" ADD CONSTRAINT "dashboard_section_items_item_id_items_metadata_id_fk" FOREIGN KEY ("item_id") REFERENCES "items_metadata"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "items_metadata" ADD CONSTRAINT "items_metadata_id_unique" UNIQUE("id");