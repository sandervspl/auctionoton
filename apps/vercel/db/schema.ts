import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

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
    realm: integer('realm')
      .notNull()
      .references(() => realms.id),
    faction: integer('faction')
      .notNull()
      .references(() => factions.id),
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
    scanitemidunq: unique('scan_item_unique').on(table.scanId, table.itemId, table.buyout),
  }),
);

export const insertAuctionsSchema = createInsertSchema(auctions);
export const selectAuctionsSchema = createSelectSchema(auctions);

export const itemsValues = sqliteTable(
  'items_values',
  {
    id: integer('id').notNull().primaryKey({ autoIncrement: true }),
    itemShortid: integer('item_shortid').notNull(),
    realm: integer('realm')
      .notNull()
      .references(() => realms.id),
    faction: integer('faction')
      .notNull()
      .references(() => factions.id),
    minBuyout: integer('min_buyout').notNull(),
    marketValue: integer('market_value').notNull(),
    historicalValue: integer('historical_value').notNull(),
    numAuctions: integer('num_auctions').notNull(),
    quantity: integer('quantity').notNull(),
    timestamp: text('ts').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    itemsvalues_itemid_idx: index('itemsvalues_itemid_realm_idx').on(
      table.itemShortid,
      table.realm,
    ),
    itemshortid_timestamp_unique: unique(
      'itemsvalues_itemshortid_timestamp_realm_faction_unique',
    ).on(table.itemShortid, table.timestamp, table.realm, table.faction),
  }),
);

export const insertItemsValuesSchema = createInsertSchema(itemsValues);
export const selectItemsValuesSchema = createSelectSchema(itemsValues);

export const factions = sqliteTable('factions', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const realms = sqliteTable('realms', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});
