-- Prices leave D1 only after archived history (R2 Parquet) holds them. See docs/adr/0001.
ALTER TABLE snapshots ADD COLUMN archived_at TEXT;
CREATE INDEX snapshots_unarchived ON snapshots(day)
  WHERE status = 'complete' AND archived_at IS NULL AND prices_pruned_at IS NULL;
