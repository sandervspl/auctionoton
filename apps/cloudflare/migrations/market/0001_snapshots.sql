CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
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
CREATE TABLE prices (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  pet_species_id INTEGER NOT NULL DEFAULT 0,
  min_buyout INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  market_value INTEGER NOT NULL,
  historical INTEGER NOT NULL,
  num_auctions INTEGER NOT NULL,
  PRIMARY KEY(snapshot_id, item_id, pet_species_id)
) WITHOUT ROWID;
CREATE TABLE published_houses (
  house_key TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
  day TEXT NOT NULL
);
CREATE INDEX snapshots_house_day ON snapshots(house_key, day DESC);
CREATE INDEX snapshots_status_day ON snapshots(status, day);
