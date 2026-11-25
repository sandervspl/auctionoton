CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "min_buyout" SET DATA TYPE numeric;
