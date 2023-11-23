DROP INDEX IF EXISTS `unique_scan`;--> statement-breakpoint
CREATE INDEX `scanmeta_id_idx` ON `scanmeta` (`id`);--> statement-breakpoint
CREATE INDEX `scanmeta_realm_idx` ON `scanmeta` (`realm`);