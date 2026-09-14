ALTER TABLE "dashboard_section_items" DROP CONSTRAINT "dashboard_section_items_dashboard_section_id_dashboard_sections_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "dashboard_section_items_dashboard_section_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "dashboard_sections_id_idx";--> statement-breakpoint
ALTER TABLE "dashboard_section_items" DROP COLUMN IF EXISTS "dashboard_section_id";