-- Copy the small staging dataset before replacing its tables. Existing readers
-- still join the same column names; imports must be idle during deployment.
CREATE TABLE snapshots_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_key TEXT NOT NULL UNIQUE,
  house_key TEXT NOT NULL,
  region TEXT NOT NULL CHECK(region IN ('eu', 'us')),
  version TEXT NOT NULL,
  auction_house_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('writing', 'complete', 'failed')),
  fetched_at TEXT,
  provider_modified_at TEXT,
  raw_key TEXT,
  expected_rows INTEGER,
  raw_bytes INTEGER,
  completed_at TEXT,
  error TEXT,
  UNIQUE(house_key, day)
);
INSERT INTO snapshots_v2
  (snapshot_key, house_key, region, version, auction_house_id, day, status,
   fetched_at, provider_modified_at, raw_key, expected_rows, raw_bytes, completed_at, error)
SELECT id, house_key, region, version, auction_house_id, day, status,
  fetched_at, provider_modified_at, raw_key, expected_rows, raw_bytes, completed_at, error
FROM snapshots ORDER BY id;

CREATE TABLE prices_v2 (
  snapshot_id INTEGER NOT NULL REFERENCES snapshots_v2(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  pet_species_id INTEGER NOT NULL DEFAULT 0,
  min_buyout INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  market_value INTEGER NOT NULL,
  historical INTEGER NOT NULL,
  num_auctions INTEGER NOT NULL,
  PRIMARY KEY(snapshot_id, item_id, pet_species_id)
) WITHOUT ROWID;
INSERT INTO prices_v2
SELECT s.id, p.item_id, p.pet_species_id, p.min_buyout, p.quantity,
  p.market_value, p.historical, p.num_auctions
FROM prices p JOIN snapshots_v2 s ON s.snapshot_key = p.snapshot_id;

CREATE TABLE published_houses_v2 (
  house_key TEXT PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots_v2(id),
  day TEXT NOT NULL
);
INSERT INTO published_houses_v2
SELECT h.house_key, s.id, h.day
FROM published_houses h JOIN snapshots_v2 s ON s.snapshot_key = h.snapshot_id;

-- Abort the migration rather than accepting a lossy copy.
CREATE TABLE compact_storage_check (ok INTEGER NOT NULL CHECK(ok = 1));
INSERT INTO compact_storage_check SELECT
  (SELECT COUNT(*) FROM snapshots) = (SELECT COUNT(*) FROM snapshots_v2)
  AND (SELECT COUNT(*) FROM prices) = (SELECT COUNT(*) FROM prices_v2)
  AND (SELECT COUNT(*) FROM published_houses) = (SELECT COUNT(*) FROM published_houses_v2);
DROP TABLE compact_storage_check;
DROP TABLE published_houses;
DROP TABLE prices;
DROP TABLE snapshots;
ALTER TABLE snapshots_v2 RENAME TO snapshots;
ALTER TABLE prices_v2 RENAME TO prices;
ALTER TABLE published_houses_v2 RENAME TO published_houses;
CREATE INDEX snapshots_status_day ON snapshots(status, day);
CREATE INDEX snapshots_house_fetched ON snapshots(house_key, fetched_at)
  WHERE status = 'complete';

CREATE TABLE item_metadata_v2 (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en_US',
  quality INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '',
  item_level INTEGER NOT NULL DEFAULT 0,
  required_level INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT ''
);
INSERT INTO item_metadata_v2
SELECT id, name, slug, locale, quality, tags, item_level, required_level,
  CASE WHEN icon = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg'
    THEN '' ELSE icon END
FROM item_metadata;
DROP TABLE item_metadata;
ALTER TABLE item_metadata_v2 RENAME TO item_metadata;
CREATE INDEX item_metadata_name ON item_metadata(name COLLATE NOCASE);
CREATE INDEX item_metadata_slug ON item_metadata(slug);
PRAGMA optimize;
