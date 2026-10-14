DROP TABLE "user_dashboard";--> statement-breakpoint
ALTER TABLE "dashboard_sections" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_section_items" ADD CONSTRAINT "dashboard_section_items_dashboard_section_id_dashboard_sections_id_fk" FOREIGN KEY ("dashboard_section_id") REFERENCES "dashboard_sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
