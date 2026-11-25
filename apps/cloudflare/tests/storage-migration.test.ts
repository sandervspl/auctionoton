import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';

it('migrates populated legacy snapshots without losing prices or publication', async () => {
  const db = env.MIGRATION_TEST;
  await applyD1Migrations(db, env.MARKET_MIGRATIONS.slice(0, 2));
  await db.batch([
    db.prepare(`INSERT INTO snapshots(id,house_key,region,version,auction_house_id,day,status)
      VALUES ('seasonal-eu-509-2026-09-01','seasonal-eu-509','eu','seasonal',509,'2026-09-01','complete')`),
    db.prepare(`INSERT INTO prices VALUES
      ('seasonal-eu-509-2026-09-01',2589,0,9007199254740991,10,1234,9876,2),
      ('seasonal-eu-509-2026-09-01',2589,42,100,3,200,300,1)`),
    db.prepare(
      `INSERT INTO published_houses VALUES ('seasonal-eu-509','seasonal-eu-509-2026-09-01','2026-09-01')`,
    ),
    db.prepare(`INSERT INTO item_metadata(id,name,slug) VALUES(2589,'Linen Cloth','linen-cloth')`),
    db.prepare(
      `INSERT INTO item_metadata(id,name,slug,icon) VALUES(2592,'Wool Cloth','wool-cloth','https://example.com/wool.jpg')`,
    ),
  ]);
  await applyD1Migrations(db, env.MARKET_MIGRATIONS);
  const snapshot = await db
    .prepare('SELECT * FROM snapshots')
    .first<{ id: number; snapshot_key: string }>();
  expect(typeof snapshot!.id).toBe('number');
  expect(snapshot!.snapshot_key).toBe('seasonal-eu-509-2026-09-01');
  const prices = await db
    .prepare(`SELECT p.* FROM published_houses h JOIN prices p
    ON p.snapshot_id=h.snapshot_id ORDER BY p.item_id`)
    .all();
  // Public CSV data has no pets, quantities or auction counts; pet variants are dropped.
  expect(prices.results).toEqual([
    {
      snapshot_id: snapshot!.id,
      item_id: 2589,
      min_buyout: Number.MAX_SAFE_INTEGER,
      market_value: 1234,
      historical: 9876,
    },
  ]);
  expect(await db.prepare('SELECT icon FROM item_metadata WHERE id=2589').first('icon')).toBe('');
  expect(await db.prepare('SELECT icon FROM item_metadata WHERE id=2592').first('icon')).toBe(
    'https://example.com/wool.jpg',
  );
  expect((await db.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
});
