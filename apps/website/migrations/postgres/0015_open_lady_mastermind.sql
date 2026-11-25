ALTER TABLE "recent_searches" DROP CONSTRAINT "recent_searches_item_id_items_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_item_id_items_metadata_id_fk" FOREIGN KEY ("item_id") REFERENCES "items_metadata"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
