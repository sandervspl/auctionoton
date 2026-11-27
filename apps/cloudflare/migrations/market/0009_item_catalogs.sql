-- The shared item catalog merges Blizzard's per-version catalogs (classic1x: Era, Hardcore and
-- Season of Discovery; classicann: Anniversary; forever: Forever). `catalogs` lists the ones that
-- contain an item, so each Game version's search index only holds its own items.
ALTER TABLE item_metadata ADD COLUMN catalogs TEXT NOT NULL DEFAULT 'classic1x';
-- When the import last read the item's binding; NULL means unknown, so the import reads it.
ALTER TABLE item_metadata ADD COLUMN binding_checked_at TEXT;
