-- Read-only inventory for migration sizing. Run against the actual production database.
-- No credentials or user records appear in the output. A slow query stops after 30 seconds.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL TIME ZONE 'UTC';

SELECT pg_database_size(current_database()) AS database_bytes,
       pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT relname AS table_name,
       n_live_tup AS estimated_live_rows,
       pg_table_size(relid) AS table_bytes,
       pg_indexes_size(relid) AS index_bytes,
       pg_total_relation_size(relid) AS total_bytes
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Rows observed on each UTC day, not net growth after retention deletes.
-- The current day's count is partial. Existing timestamp columns have no timezone;
-- confirm the application's UTC convention before relying on these boundaries.
SELECT date_trunc('day', timestamp) AS utc_day, COUNT(*) AS observed_price_rows
FROM items
WHERE timestamp >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '31 days'
GROUP BY 1
ORDER BY 1;

SELECT auction_house_id, COUNT(*) AS retained_rows,
       MIN(timestamp) AS oldest_sample, MAX(timestamp) AS newest_sample
FROM items
GROUP BY auction_house_id
ORDER BY retained_rows DESC;

SELECT COUNT(*) FILTER (WHERE timestamp IS NULL) AS rows_without_timestamp,
       COUNT(*) FILTER (WHERE min_buyout > 9007199254740991 OR min_buyout < 0
                         OR min_buyout != trunc(min_buyout)) AS unsafe_price_rows,
       MAX(min_buyout) AS maximum_min_buyout
FROM items;

COMMIT;
