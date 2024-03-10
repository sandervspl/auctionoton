CREATE TABLE IF NOT EXISTS "recent_searches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"search" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_searches_timestamp_idx" ON "recent_searches" ("timestamp");