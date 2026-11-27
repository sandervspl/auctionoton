import { parquetMetadataAsync, parquetRead, parquetReadObjects } from 'hyparquet';
import type { AsyncBuffer, FileMetaData } from 'hyparquet';
import { parquetWriteBuffer } from 'hyparquet-writer';

// Shared by the backend Worker (writes) and the website (reads). See docs/adr/0001.
// Archived history: one Parquet file per auction house per month, sorted by item then day.

/** Days of hot history kept in D1. Older snapshots are only readable from the archive. */
export const HOT_HISTORY_DAYS = 14;
const DAY = 86_400_000;

/** The oldest day still in hot history. Snapshots for earlier days are rejected and pruned. */
export const oldestHotDay = (now: string | number) =>
  new Date(new Date(now).getTime() - HOT_HISTORY_DAYS * DAY).toISOString().slice(0, 10);

export const archiveMonth = (day: string) => day.slice(0, 7);
export const archiveKey = (houseKey: string, month: string) => `v1/${houseKey}/${month}.parquet`;
const archivePrefix = (houseKey: string) => `v1/${houseKey}/`;

function lastDayOfMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

/** A sealed month can no longer receive new or corrected snapshots, so its file never changes. */
export const isSealedMonth = (month: string, now: string | number) =>
  lastDayOfMonth(month) < oldestHotDay(now);

/** Months from `fromDay`'s month through `toDay`'s month, inclusive and ascending. */
export function monthsBetween(fromDay: string, toDay: string) {
  const months: string[] = [];
  let [year, month] = archiveMonth(fromDay).split('-').map(Number) as [number, number];
  const last = archiveMonth(toDay);
  for (;;) {
    const current = `${year}-${String(month).padStart(2, '0')}`;
    if (current > last) return months;
    months.push(current);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
}

export type ArchivedPrice = {
  itemId: number;
  day: string;
  /** Milliseconds since the epoch. */
  fetchedAt: number;
  minBuyout: number;
  marketValue: number;
  historical: number;
};

type ArchiveObject = { size: number; etag: string; arrayBuffer(): Promise<ArrayBuffer> };
/** The R2 operations the archive uses, so both Workers' binding types satisfy it. */
export type HistoryBucket = {
  get(
    key: string,
    options?: { range?: { offset: number; length: number } | { suffix: number } },
  ): Promise<ArchiveObject | null>;
  head(key: string): Promise<{ size: number; etag: string } | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: { contentType?: string };
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
    },
  ): Promise<unknown>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
};

// Small row groups keep one item's rows inside a single contiguous range read.
// Only item_id carries statistics, which keeps the footer small enough for one tail read.
const ROW_GROUP_ROWS = 4000;
const TAIL_BYTES = 64 * 1024;

export function encodeArchive(rows: ArchivedPrice[]) {
  const sorted = [...rows].sort((a, b) => a.itemId - b.itemId || a.day.localeCompare(b.day));
  const plain = { nullable: false, statistics: false, offsetIndex: false } as const;
  return parquetWriteBuffer({
    columnData: [
      {
        name: 'item_id',
        data: Int32Array.from(sorted, (row) => row.itemId),
        type: 'INT32',
        nullable: false,
        statistics: true,
        offsetIndex: false,
      },
      { name: 'day', data: sorted.map((row) => row.day), type: 'STRING', ...plain },
      {
        name: 'fetched_at',
        data: BigInt64Array.from(sorted, (row) => BigInt(row.fetchedAt)),
        type: 'TIMESTAMP',
        ...plain,
      },
      ...(['minBuyout', 'marketValue', 'historical'] as const).map((field) => ({
        name:
          field === 'minBuyout' ? 'min_buyout' : field === 'marketValue' ? 'market_value' : field,
        data: BigInt64Array.from(sorted, (row) => BigInt(row[field])),
        type: 'INT64' as const,
        ...plain,
      })),
    ],
    rowGroupSize: ROW_GROUP_ROWS,
    statistics: false,
    kvMetadata: [{ key: 'auctionoton.archive', value: 'v1' }],
    createdBy: 'auctionoton',
  });
}

type ParquetRecord = {
  item_id: number;
  day: string;
  fetched_at: Date;
  min_buyout: bigint;
  market_value: bigint;
  historical: bigint;
};
const fromRecord = (row: ParquetRecord): ArchivedPrice => ({
  itemId: row.item_id,
  day: row.day,
  fetchedAt: row.fetched_at.getTime(),
  minBuyout: Number(row.min_buyout),
  marketValue: Number(row.market_value),
  historical: Number(row.historical),
});

/** Serves byte ranges of an R2 object, starting with one tail read that holds the footer. */
async function r2File(bucket: HistoryBucket, key: string): Promise<AsyncBuffer | null> {
  const tail = await bucket.get(key, { range: { suffix: TAIL_BYTES } });
  if (!tail) return null;
  const size = tail.size;
  const tailBytes = await tail.arrayBuffer();
  const tailStart = size - tailBytes.byteLength;
  return {
    byteLength: size,
    async slice(start, end = size) {
      if (start >= tailStart) return tailBytes.slice(start - tailStart, end - tailStart);
      const part = await bucket.get(key, { range: { offset: start, length: end - start } });
      if (!part) throw new Error(`Archive ${key} disappeared during a read`);
      return part.arrayBuffer();
    },
  };
}

/** One item's archived prices for a month, reading only the footer and its row groups. */
export async function readArchivedItem(
  bucket: HistoryBucket,
  houseKey: string,
  month: string,
  itemId: number,
): Promise<ArchivedPrice[]> {
  const file = await r2File(bucket, archiveKey(houseKey, month));
  if (!file) return [];
  const metadata: FileMetaData = await parquetMetadataAsync(file, { initialFetchSize: TAIL_BYTES });
  const rows = (await parquetReadObjects({
    file,
    metadata,
    filter: { item_id: { $eq: itemId } },
  })) as ParquetRecord[];
  return rows.map(fromRecord);
}

/** Every row of a month file, or an empty month if it does not exist yet. */
async function readArchiveMonth(bucket: HistoryBucket, key: string) {
  const object = await bucket.get(key);
  if (!object) return { rows: [] as ArchivedPrice[], etag: null };
  const buffer = await object.arrayBuffer();
  // Column chunks avoid materializing a second full set of row objects in Workflow memory.
  const columns = new Map<string, unknown[]>();
  let count = 0;
  await parquetRead({
    file: buffer,
    onChunk: ({ columnName, columnData, rowStart }) => {
      const column = columns.get(columnName) ?? [];
      for (let i = 0; i < columnData.length; i++) column[rowStart + i] = columnData[i];
      columns.set(columnName, column);
      count = Math.max(count, rowStart + columnData.length);
    },
  });
  const column = <T>(name: keyof ParquetRecord) => (columns.get(name) ?? []) as T[];
  const [itemIds, days, fetchedAt, minBuyout, marketValue, historical] = [
    column<number>('item_id'),
    column<string>('day'),
    column<Date>('fetched_at'),
    column<bigint>('min_buyout'),
    column<bigint>('market_value'),
    column<bigint>('historical'),
  ];
  const rows = Array.from({ length: count }, (_, i) =>
    fromRecord({
      item_id: itemIds[i]!,
      day: days[i]!,
      fetched_at: fetchedAt[i]!,
      min_buyout: minBuyout[i]!,
      market_value: marketValue[i]!,
      historical: historical[i]!,
    }),
  );
  return { rows, etag: object.etag };
}

/**
 * Replaces one day of a month file with `rows` and writes it back. The conditional write fails
 * when another import changed the file in between, so the caller's retry re-reads it.
 */
export async function replaceArchivedDay(
  bucket: HistoryBucket,
  houseKey: string,
  day: string,
  rows: ArchivedPrice[],
) {
  const key = archiveKey(houseKey, archiveMonth(day));
  const existing = await readArchiveMonth(bucket, key);
  const merged = existing.rows.filter((row) => row.day !== day).concat(rows);
  const written = await bucket.put(key, encodeArchive(merged), {
    httpMetadata: { contentType: 'application/vnd.apache.parquet' },
    onlyIf: existing.etag ? { etagMatches: existing.etag } : { etagDoesNotMatch: '*' },
  });
  if (!written) throw new Error(`Archive ${key} changed during the write; retrying`);
  return { key, rows: merged.length };
}

/** Archived months for an auction house, ascending. */
export async function listArchivedMonths(bucket: HistoryBucket, houseKey: string) {
  const prefix = archivePrefix(houseKey);
  const months: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    for (const object of page.objects) {
      const month = object.key.slice(prefix.length, -'.parquet'.length);
      if (/^\d{4}-\d{2}$/.test(month)) months.push(month);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return months.sort();
}
