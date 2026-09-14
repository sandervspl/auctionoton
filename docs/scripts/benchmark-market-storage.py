"""Offline SQLite sizing experiment; never connects to or changes Cloudflare.

Usage: python3 docs/scripts/benchmark-market-storage.py /path/to/rows.json
Input: Wrangler --json output for the four SELECTs in market-storage-plan.md.
Raw provider exports should stay outside the repository.
"""

import hashlib
import json
from pathlib import Path
import sqlite3
import sys


root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1])
export = json.loads(source.read_text())
metadata, prices, snapshots, published = [part["results"] for part in export]
assert len(snapshots) == 1, "This experiment expects the single-snapshot trial export"
assert len(prices) == snapshots[0]["expected_rows"]
schema = "\n".join(
    path.read_text()
    for path in [root / "apps/cloudflare/migrations/market" / name
                 for name in ("0001_snapshots.sql", "0002_item_metadata.sql")]
)


def insert(db, table, rows):
    if not rows:
        return
    columns = list(rows[0])
    db.executemany(
        f"INSERT INTO {table} ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
        [tuple(row[column] for column in columns) for row in rows],
    )


def sizes(db):
    return {
        "bytes": db.execute("PRAGMA page_count").fetchone()[0] * 4096,
        "objects": {
            name: {"allocated": allocated, "payload": payload, "unused": unused}
            for name, allocated, payload, unused in db.execute(
                "SELECT name, SUM(pgsize), SUM(payload), SUM(unused) FROM dbstat GROUP BY name"
            )
        },
    }


def trial(short_icon=False, integer_snapshot=False, remove_name_index=False):
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA page_size = 4096")
    db.execute("PRAGMA foreign_keys = ON")
    ddl = schema
    if integer_snapshot:
        ddl = ddl.replace("id TEXT PRIMARY KEY,", "id INTEGER PRIMARY KEY,")
        ddl = ddl.replace("snapshot_id TEXT", "snapshot_id INTEGER")
    db.executescript(ddl)
    if remove_name_index:
        db.execute("DROP INDEX item_metadata_name")
    snapshot_rows = [dict(row, id=1) if integer_snapshot else row for row in snapshots]
    price_rows = [dict(row, snapshot_id=1) if integer_snapshot else row for row in prices]
    pointer_rows = [dict(row, snapshot_id=1) if integer_snapshot else row for row in published]
    item_rows = [dict(row, icon="") if short_icon else row for row in metadata]
    insert(db, "snapshots", snapshot_rows)
    insert(db, "prices", price_rows)
    insert(db, "published_houses", pointer_rows)
    insert(db, "item_metadata", item_rows)
    db.commit()
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    result = sizes(db)
    db.close()
    return result


def rolling_prices(days, integer_snapshot):
    # Repeated copies of the measured market, not real observations of other days.
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA page_size = 4096")
    key_type = "INTEGER" if integer_snapshot else "TEXT"
    db.execute(f"""CREATE TABLE prices (
        snapshot_id {key_type} NOT NULL, item_id INTEGER NOT NULL,
        pet_species_id INTEGER NOT NULL, min_buyout INTEGER NOT NULL,
        quantity INTEGER NOT NULL, market_value INTEGER NOT NULL,
        historical INTEGER NOT NULL, num_auctions INTEGER NOT NULL,
        PRIMARY KEY(snapshot_id, item_id, pet_species_id)
    ) WITHOUT ROWID""")
    for day in range(days):
        # Use realistic multi-byte IDs; a single ID=1 understates larger databases.
        key = 1000 + day if integer_snapshot else f"seasonal-eu-509-2026-08-{day + 1:02}"
        insert(db, "prices", [dict(row, snapshot_id=key) for row in prices])
    db.commit()
    result = sizes(db)
    assert db.execute("SELECT COUNT(*) FROM prices").fetchone()[0] == days * len(prices)
    db.close()
    return result


result = {
    "sqlite_version": sqlite3.sqlite_version,
    "export_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "rows": {"metadata": len(metadata), "prices": len(prices)},
    "baseline": trial(),
    "empty_placeholder": trial(short_icon=True),
    "integer_snapshot": trial(integer_snapshot=True),
    "combined": trial(short_icon=True, integer_snapshot=True),
    "combined_without_name_index": trial(True, True, True),
    "thirty_days_text": rolling_prices(30, False),
    "thirty_days_integer": rolling_prices(30, True),
}
print(json.dumps(result, indent=2))
