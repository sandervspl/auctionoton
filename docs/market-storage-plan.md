**Auctionoton market storage: findings and implementation plan**

Research date: 14 September 2026. Source baseline: `1362579`. Recommendation: keep D1, compact the shared catalog and snapshot references, and implement retention before expanding scheduled ingestion.

The initial measurement of `auctionoton-staging-market` was **4,931,584 bytes**, but almost all of that was the shared item catalog. It contained 22,842 catalog items, 4,299 price rows, and one completed daily snapshot: Wild Growth EU Alliance, auction house 509, on 13 September. Adding a market does not require another copy of the catalog.

The initial research was read-only, with schema experiments run locally. The measurements below preserve that baseline; implementation and staging validation are recorded at the end of this document.

Cloudflare did not expose `dbstat` on this database, so per-table figures below come from a local SQLite reconstruction using the exact staging rows and committed schema. Its 4,915,200-byte total differs from live D1 by just 16,384 bytes; the reconstruction omits Cloudflare/Alchemy bookkeeping. These are credible sizing measurements, not exact remote table allocations or promises about post-migration disk reclamation. MB and GB below use decimal units.

| Local reconstruction | Bytes | Share |
| --- | ---: | ---: |
| Item catalog records | 3,166,208 | 64.4% |
| Name and slug indexes | 1,486,848 | 30.3% |
| One day's prices | 229,376 | 4.7% |
| Snapshot records and remaining schema/indexes | 32,768 | 0.7% |

The catalog occupies **4.65 MB including indexes**, about 95% of the reconstruction. Price storage is approximately **0.23 MB per market per daily snapshot** for this sample. It is already an item/variant summary, rather than individual auction listings.

The original catalog stored the same 71-byte placeholder icon URL 22,842 times: **1,621,782 bytes of identical text**. Every item also had `en_US` and empty tags. Defaults in this freshly created schema still materialize repeated field values in inserted records; setting a default does not deduplicate them.

The [catalog importer](../packages/infrastructure/scripts/import-item-catalog.mjs) imports the entire Blizzard catalog without a realm filter. Keep those names available even when an item is absent from today's auctions; deleting unlisted items would shrink storage by changing search behavior.

The [price schema](../apps/cloudflare/migrations/market/0001_snapshots.sql) already uses `WITHOUT ROWID` with a composite primary key and stores integer copper values. Preserve both decisions. Its main avoidable cost is repeating the 26-character snapshot ID `seasonal-eu-509-2026-09-13` in every price row. An integer foreign key can replace that string while the Workflow and R2 keys retain their readable identities. SQLite already stores small integers compactly; changing `INTEGER` to `SMALLINT` is not a storage fix. [SQLite file format](https://www.sqlite.org/fileformat2.html), [WITHOUT ROWID](https://www.sqlite.org/withoutrowid.html)

Measured experiments preserved every price field and item variant:

| Experiment | Local total | Change from baseline |
| --- | ---: | ---: |
| Existing schema and values | 4.915 MB | Baseline |
| Empty placeholder token; application supplies image URL | 3.211 MB | 1.704 MB smaller |
| Integer snapshot IDs only | 4.788 MB | 0.127 MB smaller |
| Both changes | 3.084 MB | 37.3% smaller |
| Both changes, also omitting name index | 2.343 MB | 52.3% smaller; conditional option |

The combined experiment retains both catalog indexes. It is the recommended initial target. The single-snapshot experiment uses ID 1; a separate 30-day experiment uses IDs 1000–1029 to account for larger integer encodings. With 128,970 copied price rows, the price table shrank from **6,885,376 to 3,371,008 bytes, a 51.0% reduction**. These copies model storage layout; they do not measure real day-to-day changes.

Live `EXPLAIN QUERY PLAN` for the website's full search projection reports `SCAN item_metadata`; the name index does not help that particular `%term% OR id = ?` query. Removing it saved another 741,376 bytes locally. Treat removal as conditional on checking every catalog query and representative search latency. Keep the slug index because `itemFromSlug()` uses it. If substring search becomes expensive, benchmark a search-specific design; FTS5 also consumes storage and writes. [D1 index guidance](https://developers.cloudflare.com/d1/best-practices/use-indexes/)

**Growth follows distinct auction houses and retained days.**

The archived provider catalog from 13 September has **328 realm/auction-house references but only 194 distinct region/version/auction-house combinations** for the four supported versions. Of those, 28 are Season of Discovery. Deduplicate discovery by `(version, region, auctionHouseId)` before dispatching work. Shared realm markets should produce one snapshot; separate faction markets remain separate. Existing snapshot uniqueness already prevents duplicate daily price rows, so discovery deduplication primarily saves redundant fetches and job work.

The following scenarios assume one daily sample, 30 retained days, and exactly 4,299 rows per house with Wild Growth's value distribution. Totals include one shared catalog, using the corresponding existing/compact layout, and approximate fixed schema overhead. Extra snapshot metadata, migration headroom, failed jobs, and larger catalogs require a margin.

| Distinct auction houses | Retained price rows | Current layout | Compact layout |
| --- | ---: | ---: | ---: |
| 1 | 128,970 | 11.6 MB | 6.4 MB |
| 28 | 3,611,160 | 197.5 MB | 97.4 MB |
| 100 | 12,897,000 | 693.2 MB | 340.1 MB |
| 194 | 25,020,180 | 1.34 GB | 0.66 GB |

Use `shared catalog + SUM(rows per house per day × retained days × measured bytes per row)` for capacity planning. The sample's 30-day table averages roughly 53.4 bytes per row now and 26.1 bytes with integer snapshot IDs. These averages depend on values, insertion order, and database layout. Doubling fetch frequency approximately doubles retained rows; moving from 30 days to seven would cut history by 76.7%, but would change the existing retention policy. Keep 30 days by default.

At the research baseline, no D1 history cleanup existed in the Cloudflare code. The PostgreSQL cleanup script does not clean D1. The R2 bucket's only lifecycle rule aborted incomplete multipart uploads; completed raw files and normalized chunks had no expiry. Automatic daily imports were disabled.

The estimated steady-state price inserts plus retention deletes for 194 sample-sized houses are **50.04 million rows per 30 days**, before other writes or index maintenance. D1 Paid includes 50 million written rows/month and 5 GB total storage; additional writes cost $1/million and storage costs $0.75/GB-month. Shrinking rows saves space, but leaves the row-write count unchanged. At 10,000 items per house, the same scenario reaches 116.4 million base writes, about $66.40 beyond that write allowance. These are workload illustrations, not total bills; account-wide usage also consumes allowances. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

D1's per-database ceiling is 10 GB on Paid or 500 MB on Free. Each database processes queries serially. The measurements here do not establish the account's subscription. Free also caps daily writes at 100,000, so plan eligibility needs checking before broad ingestion. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

**Implement in this order.** Estimates assume one developer and the existing Workers tests; allow roughly 3–5 working days for the initial changes and staging validation, plus time to observe several daily runs.

1. **Compact catalog values and snapshot references (1–2 days).** Store an empty icon token and resolve it to the existing placeholder URL in the metadata adapter; update the importer and schema default so subsequent imports stay compact. Actual icons can use a short asset key with a shared URL prefix. Convert `snapshots.id` and its price/published-pointer references to integer keys, preserving `UNIQUE(house_key, day)`. Resolve the internal ID once per job/chunk rather than once per row. Preserve readable Workflow/R2 IDs, retry idempotency, all five price statistics, pet variants, and atomic publication. Keep catalog data shared; when supporting more game namespaces/locales, explicitly scope its identity instead of overwriting different versions under the same item ID.

2. **Bound D1 and R2 retention (about 1 day).** Keep 30 days of completed prices plus the latest published snapshot per house even when it is older. Delete expired price rows in bounded batches, initially 1,000 per statement, before deleting their snapshot metadata. Exclude published pointers and actively running imports; reconcile abandoned/failed jobs before cleanup. Proposed raw archive retention is 35 days, with backups and archives needed by pinned snapshots in a separate retained prefix. Delete normalized chunks after successful publication and a seven-day retry window; do not apply blanket age expiry to active jobs. A Workflow may resume after its normalization step, so prove that replay can regenerate missing chunks before enabling expiry. R2 lifecycle rules can target eligible prefixes, but their deletions are asynchronous. Verify cleanup against real Workflow state. [D1 batch guidance](https://developers.cloudflare.com/d1/platform/limits/), [R2 lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

3. **Make discovery and reads scale with the selected house (0.5–1 day).** Enqueue distinct house keys, persist provider modification timestamps, and record expected versus completed houses. Rewrite seven-day history filtering around `house_key` and a bounded time range. Its current plan searches all completed snapshots via `snapshots_status_day`, then filters the house; do not assume the existing house/day index fixes this without measurement. Even adding house/day predicates still chose the status index in the one-row live database. Benchmark representative multi-house data, update planner statistics after schema changes, and add a small partial/composite snapshot index only if needed. Avoid a second large price-table index without evidence. Audit the catalog name index separately. [Query planner and index guidance](https://developers.cloudflare.com/d1/best-practices/use-indexes/)

4. **Validate on staging and measure representative markets (about 1 day).** Use an Alchemy-owned migration with shadow replacement tables and bounded copying. Compare complete row contents, per-snapshot counts, foreign keys, seven-day charts, latest/previous values, slug routes, and search results before switching readers. Pause imports during the final migration switch; retain a usable backup and old layout until rollback is proven. Exercise duplicate chunks, interrupted imports, out-of-order publication, empty houses, and cleanup of old snapshots while preserving stale published data. Then sample several distinct markets per supported version/region and the largest observed payload, measuring bytes/row, rows written, read counts, and latency. Record daily growth until retention reaches steady state. Do not treat a locally rebuilt size as proof that an in-place remote update immediately shrinks its allocated file; measure remote size and subsequent reuse. `PRAGMA optimize` updates query-planner statistics; it is not a compaction operation. [D1 SQL statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)

5. **Partition only when measured capacity or latency requires it.** Keep one market database initially if the verified plan and workload allow it. Start designing a split when projected retained size plus migration/retry headroom approaches half the applicable database limit, or ingestion harms read latency. Route by version/region, then split large groups by house key. When creating multiple market databases, give the catalog its own shared binding so it does not get copied into every shard; compose catalog and price results in the Worker. Sharding creates capacity and independent execution, but does not reduce total stored bytes or account-wide write charges.

The raw R2 snapshot also has a useful compression opportunity: local gzip level 6 reduced **609,757 bytes to 63,085 bytes (89.7%)**. Archive compression requires a versioned encoding marker and a streaming decoder that enforces the existing decoded-size cap. This saves R2 space only. It does not shrink D1. Prioritize retention first; Standard R2 storage is $0.015/GB-month beyond its allowance, with separate operation charges. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

Keep SQL rows for active history. Whole-house JSON blobs would make individual item lookups decode a complete snapshot and obscure indexing. They also face D1's 2 MB row limit. R2 already provides the right place for replay archives. Do not drop price statistics, merge distinct factions, round copper values, or switch to change-only history as an initial optimization. Change-only history needs measurements across real days and explicit rules for missing items, unchanged observations, chart gaps, and replay; one snapshot cannot establish its savings. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

**Reproducing the experiment.**

The benchmark expects an export of the original schema, before migration `0003`. From `packages/infrastructure`, the baseline export was obtained with this read-only query and saved outside the repository:

```bash
pnpm exec wrangler d1 execute auctionoton-staging-market --remote --command \
  'SELECT * FROM item_metadata ORDER BY id; SELECT * FROM prices ORDER BY snapshot_id,item_id,pet_species_id; SELECT * FROM snapshots; SELECT * FROM published_houses;' \
  --json > /tmp/auctionoton-market-rows.json
```

From the repository root:

```bash
python3 docs/scripts/benchmark-market-storage.py /tmp/auctionoton-market-rows.json
```

The [offline script](scripts/benchmark-market-storage.py) intentionally expects the original single-snapshot trial dataset. It creates only in-memory SQLite databases, checks row counts/foreign keys, and prints per-object allocations and comparison results. It explicitly uses migrations `0001` and `0002` to preserve the baseline; a post-migration export is not a compatible input. The run used SQLite 3.51.3 with 4 KiB pages and no `VACUUM`. Raw provider exports remain outside version control. The downloaded raw snapshot matched the previously recorded SHA-256 `4a4efada84273cb253be2625008dde7f87f9c2f40306c00eede179b5de0d87da`.

Additional offline checks reconciled all 4,299 exported price rows, including every stored statistic and item/variant identity, against the raw provider archive. A gzip/decompression round trip preserved all 609,757 source bytes. Python syntax, local document links, and whitespace checks passed.

**Implementation, 14 September 2026.**

Migrations `0003` and `0004` implement integer snapshot references and retention tracking. The shared catalog now stores short Blizzard icon asset names; metadata adapters expand them for search, item pages, recent searches, collections, and the public price API. The catalog importer fetches both item and media catalogs with ID pagination and avoids rewriting unchanged rows. Both catalog indexes are retained.

The maintenance Workflow runs daily at 04:30 UTC independently of the disabled import cron. It prunes completed, unpublished prices older than 30 days in 1,000-row batches, keeps every latest published snapshot, removes completed normalized chunks after seven days, and deletes eligible raw archives and metadata after 35 days. Active and failed imports are retained for operator reconciliation. New imports outside the retention window are rejected; existing imports may resume. Non-reused integer IDs, identity guards, and retry selection prevent cleanup from affecting replacement records or stranding old metadata.

Discovery supports an explicit allowlist, deduplicates shared markets, persists provider modification timestamps, and reports expected houses. History queries now filter the selected house and use a partial `(house_key, fetched_at)` index for completed snapshots. Staging still enables only Wild Growth EU Alliance. Catalog identity must be scoped by namespace/locale before other game catalogs are imported.

The pinned Alchemy version skipped migration-file drift detection when database names remained unresolved Effects. Database props now resolve those names before registration; the deployment preview correctly includes pending migrations without replacing databases. Keep Alchemy as the sole schema owner.

Before deployment, the exported SQL backup was restored locally and its original rows were verified. A retained copy is stored at `auctionoton-staging-snapshots/migration-backups/2026-09-14-before-compact.sql`. Staging had no active import. Local migration tests reconciled all 4,299 original price rows field for field, including pet variants. The independent review's cleanup race and retry findings were fixed and covered by regression tests.

**Verified staging results.**

| Measurement | Result |
| --- | ---: |
| Original database, one snapshot and placeholder icons | 4,931,584 bytes |
| Migrated database, same prices and actual Blizzard icons | 3,477,504 bytes |
| Reduction for the same snapshot | 1,454,080 bytes / 29.49% |
| Database after importing 14 September as a second snapshot | 3,579,904 bytes |
| Additional allocation for the second day's 4,318 prices | 102,400 bytes |
| Total retained prices after validation | 8,617 |
| Catalog items with provider icon assets | 22,839 / 22,842 |

Alchemy applied all four migrations successfully; its follow-up plan reports no changes. The remote post-migration export matched every original price field and every verified catalog row, and `foreign_key_check` returned no violations. No catalog rows retain the old repeated Wowhead placeholder URL. The three items with no Blizzard asset are monster bottle/glass items 2716, 2717, and 2718; individual media requests confirmed empty asset lists. Two other items legitimately have Blizzard's question-mark asset. The live Linen Cloth and Wool Cloth API responses and rendered item pages contain their correct icons, and both image URLs return HTTP 200.

The manual `daily-2026-09-14` run completed discovery, Queue delivery, archival, normalization, integer-key writes, and publication. Its snapshot has 4,318 rows, a 611,323-byte raw archive, and provider modification time `2026-09-14T07:00:57.000Z`. A duplicate delivery preserved its count and fetch timestamp. `maintenance-2026-09-14` completed both cleanup steps successfully, deleting nothing because no data was old enough. Actual expiry and pinned/failed snapshot protections were exercised in workerd tests; observing real 30/35-day expiry remains a rollout check.

Validation passed: 25 Worker integration tests, 28 website authentication tests, 12 built-website smoke tests, and all 13 lint/typecheck tasks. The backup, exports, generated catalog SQL, and detailed validation output remain outside Git; the retained backup is also in R2.

Next rollout work: measure representative and large markets, verify account quotas and provider capacity, scope catalog identities before adding other game namespaces/locales, and observe cleanup and read latency across daily runs. Keep automatic auction imports disabled until those gates pass. Failed-job reconciliation, discovery-catalog archive retention, optional raw compression, search-index tuning, and eventual partitioning remain separate follow-ups. The initial compact storage, item icons, completed-snapshot retention, and configured-house discovery are deployed.
