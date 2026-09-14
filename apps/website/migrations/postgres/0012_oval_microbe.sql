ALTER TABLE "dashboard_sections_section_items" DROP CONSTRAINT "dashboard_sections_section_items_dashboard_section_item_id_dashboard_section_items_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_sections_section_items" ADD CONSTRAINT "dashboard_sections_section_items_dashboard_section_item_id_dashboard_section_items_id_fk" FOREIGN KEY ("dashboard_section_item_id") REFERENCES "dashboard_section_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
