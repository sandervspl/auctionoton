-- TSM's public CSV files have no quantity, auction count or pet data. Rebuild prices with only
-- the columns they provide. Pet variants (pet_species_id != 0) were never served and are dropped.
-- Imports must be idle during deployment.
CREATE TABLE prices_v3 (
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  min_buyout INTEGER NOT NULL,
  market_value INTEGER NOT NULL,
  historical INTEGER NOT NULL,
  PRIMARY KEY(snapshot_id, item_id)
) WITHOUT ROWID;
INSERT INTO prices_v3
SELECT snapshot_id, item_id, min_buyout, market_value, historical
FROM prices WHERE pet_species_id = 0;

-- Abort the migration rather than accepting a lossy copy.
CREATE TABLE public_csv_prices_check (ok INTEGER NOT NULL CHECK(ok = 1));
INSERT INTO public_csv_prices_check SELECT
  (SELECT COUNT(*) FROM prices WHERE pet_species_id = 0) = (SELECT COUNT(*) FROM prices_v3);
DROP TABLE public_csv_prices_check;
DROP TABLE prices;
ALTER TABLE prices_v3 RENAME TO prices;
PRAGMA optimize;
