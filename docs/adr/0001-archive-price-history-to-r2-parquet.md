---
status: accepted
---

# Archive price history to monthly Parquet files in R2

Storing every snapshot's prices in D1 forever does not scale to the full realm catalog (about 0.66 GB per 30 days at roughly 194 auction houses), yet price history must stay readable for long-range charts. D1 therefore keeps only 14 days of hot history. Everything older lives as archived history in R2 Standard, kept forever at full daily detail, as one Parquet file per auction house per month, sorted by item. The Worker reads one item's rows with HTTP range requests.

After each snapshot is published, its rows are copied from D1 into the current month's file, which is rewritten daily. A day is deleted from D1, together with its snapshot record, only after the archive is confirmed to contain it. Import jobs for days older than the hot window are rejected, so a month is **sealed** once its last day is older than 14 days. Sealed months are cached at the edge forever; unsealed months only until the next import.

Raw TSM CSVs are gzipped when downloaded, kept forever, and moved to R2 Infrequent Access after 35 days. They are kept for reprocessing, not for reading.

## Considered options

- **Infrequent Access for archived history**: stores data for $0.01/GB instead of $0.015, but every chart read pays $0.01/GB retrieval and 2.5× the Class B price, and there is no free tier. That fits only the raw CSVs, which are almost never read.
- **Basin Catalog / Basin SQL (Iceberg)**: GA, but Worker access and query latency are unproven, and it adds a dependency. The Parquet files can still be registered later.
- **One file per auction house per day**: a 1-year chart would need 365 whole-file reads.
- **Merging daily files into a monthly file at month end**: two layouts to read and a merge that can fail. Rewriting the current month daily avoids both.
- **Archiving only finished months**: D1 would hold 14–31 days, giving up most of the saving from the 14-day window.
- **Downsampling older history**: discards data for little saving once it is compressed. Charts send every daily point.

## Consequences

- A 30-day chart spans hot and archived history. If the archive cannot be read, charts fall back to hot history with a notice.
- The archive, not D1, is the record of which days exist for an auction house.
- Only the website reads archived history. The extension and public API serve latest prices only.
