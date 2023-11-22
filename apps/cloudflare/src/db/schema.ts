import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';

export const items = sqliteTable(
  'items',
  {
    id: text('id').notNull().primaryKey(),
    shortid: integer('shortid').notNull(),
    name: text('name').notNull(),
    sellPrice: integer('SellPrice').notNull(),
    stackCount: integer('StackCount').notNull(),
    classId: integer('ClassID').notNull(),
    subclassId: integer('SubClassID').notNull(),
    rarity: integer('Rarity').notNull(),
    minLevel: integer('MinLevel').notNull(),
    link: text('Link').notNull(),
    olink: text('OLink').notNull(),
    timestamp: text('ts').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameidx: index('nameidx').on(table.name),
    rarityidx: index('rarityidx').on(table.rarity),
    sellpriceidx: index('sellpriceidx').on(table.sellPrice),
  }),
);

export const insertItemsSchema = createInsertSchema(items);

export const scanmeta = sqliteTable(
  'scanmeta',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    realm: text('realm').notNull(),
    faction: text('faction', { enum: ['Neutral', 'Alliance', 'Horde'] }).notNull(),
    scanner: text('scanner').notNull(),
    timestamp: text('ts').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    unique_scan: unique('unique_scan').on(table.timestamp, table.scanner),
  }),
);

export const insertScanmetaSchema = createInsertSchema(scanmeta);

export const auctions = sqliteTable(
  'auctions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    scanId: integer('scanId')
      .notNull()
      .references(() => scanmeta.id),
    itemId: text('itemId')
      .notNull()
      .references(() => items.id),
    timestamp: text('ts').default(sql`CURRENT_TIMESTAMP`),
    seller: text('seller').notNull(),
    timeLeft: integer('timeLeft').notNull(),
    itemCount: integer('itemCount').notNull(),
    minBid: integer('minBid').notNull(),
    buyout: integer('buyout').notNull(),
    curBid: integer('curBid').notNull(),
  },
  (table) => ({
    buyoutidx: index('buyoutidx').on(table.buyout),
    itemididx: index('itemididx').on(table.itemId),
  }),
);

export const insertAuctionsSchema = createInsertSchema(auctions);
