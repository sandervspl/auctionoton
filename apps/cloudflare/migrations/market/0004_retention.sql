ALTER TABLE snapshots ADD COLUMN prices_pruned_at TEXT;
ALTER TABLE snapshots ADD COLUMN chunks_cleaned_at TEXT;
ALTER TABLE snapshots ADD COLUMN raw_cleaned_at TEXT;
CREATE INDEX snapshots_retention ON snapshots(day)
  WHERE status = 'complete' AND prices_pruned_at IS NULL;
