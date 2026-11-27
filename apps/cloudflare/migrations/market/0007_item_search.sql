-- Item search (docs/adr/0001-in-browser-item-search.md). Binding and item classes come from the
-- next catalog import; until then binding is NULL and items count as unbound. Existing rows get a
-- first-seen date outside the 30-day grace window, so only a Realm sweep makes them searchable.
ALTER TABLE item_metadata ADD COLUMN binding TEXT;
ALTER TABLE item_metadata ADD COLUMN item_class TEXT NOT NULL DEFAULT '';
ALTER TABLE item_metadata ADD COLUMN item_subclass TEXT NOT NULL DEFAULT '';
ALTER TABLE item_metadata ADD COLUMN first_seen_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z';

-- Per Game version aggregates from the latest successful Realm sweep. Prices are never kept.
CREATE TABLE item_observations (
  version TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  realms INTEGER NOT NULL,
  PRIMARY KEY(version, item_id)
) WITHOUT ROWID;

CREATE TABLE realm_sweeps (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('complete', 'failed')),
  realms INTEGER NOT NULL,
  failed_realms INTEGER NOT NULL,
  items INTEGER NOT NULL
);
CREATE INDEX realm_sweeps_latest ON realm_sweeps(version, status, completed_at);

CREATE TABLE search_synonyms (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('item', 'word')),
  term TEXT NOT NULL,
  -- Item synonyms: a JSON array of item ids. Word synonyms: the expansion words.
  target TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(kind, term)
);

-- The current index file per Game version; files live in the search index bucket.
CREATE TABLE search_indexes (
  version TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  items INTEGER NOT NULL,
  built_at TEXT NOT NULL
);
