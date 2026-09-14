CREATE TABLE IF NOT EXISTS "dashboard_sections_section_items" (
	"dashboard_section_id" integer NOT NULL,
	"dashboard_section_item_id" integer NOT NULL,
	CONSTRAINT "dashboard_sections_section_items_dashboard_section_id_dashboard_section_item_id_pk" PRIMARY KEY("dashboard_section_id","dashboard_section_item_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_sections_section_items" ADD CONSTRAINT "dashboard_sections_section_items_dashboard_section_id_dashboard_sections_id_fk" FOREIGN KEY ("dashboard_section_id") REFERENCES "dashboard_sections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_sections_section_items" ADD CONSTRAINT "dashboard_sections_section_items_dashboard_section_item_id_dashboard_section_items_id_fk" FOREIGN KEY ("dashboard_section_item_id") REFERENCES "dashboard_section_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
