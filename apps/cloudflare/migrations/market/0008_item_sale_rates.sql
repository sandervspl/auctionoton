-- Sale rates per Game version from the operator's TSM region data, uploaded by
-- packages/infrastructure/scripts/upload-tsm-sales.mjs. Only used to rank search results;
-- never shown or served.
CREATE TABLE item_sale_rates (
  version TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  sold_per_day REAL NOT NULL,
  PRIMARY KEY(version, item_id)
) WITHOUT ROWID;

CREATE TABLE sale_rate_uploads (
  version TEXT PRIMARY KEY,
  -- TSM region keys the rates came from, e.g. "Forever-EU".
  sources TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  items INTEGER NOT NULL
);
