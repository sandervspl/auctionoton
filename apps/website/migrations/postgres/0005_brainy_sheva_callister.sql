CREATE TABLE IF NOT EXISTS "dashboard_section_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"dashboard_section_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboard_sections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_dashboard" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_section_items_dashboard_section_id_idx" ON "dashboard_section_items" ("dashboard_section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboard_sections_id_idx" ON "dashboard_sections" ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_dashboard_user_id_idx" ON "user_dashboard" ("user_id");