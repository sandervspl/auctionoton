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
    items_id_idx: index('items_id_idx').on(table.id),
    items_shortid_idx: index('items_shortid_idx').on(table.shortid),
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
    scanmeta_timestamp_scanner_uniq: unique('scanmeta_timestamp_scanner_uniq').on(
      table.timestamp,
      table.scanner,
    ),
    scanmeta_id_idx: index('scanmeta_id_idx').on(table.id),
    scanmeta_realm_idx: index('scanmeta_realm_idx').on(table.realm),
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
    auctions_scanid_itemid_idx: unique('auctions_scanid_itemid_idx').on(table.scanId, table.itemId),
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
    items_values_item_shortid_realm_faction_idx: index(
      'items_values_item_shortid_realm_faction_idx',
    ).on(table.itemShortid, table.realm, table.faction),
    itemsvalues_itemshortid_timestamp_realm_faction_unique: unique(
      'itemsvalues_itemshortid_timestamp_realm_faction_unique',
    ).on(table.itemShortid, table.timestamp, table.realm, table.faction),
  }),
);

export const insertItemsValuesSchema = createInsertSchema(itemsValues);
export const selectItemsValuesSchema = createSelectSchema(itemsValues);

export const factions = sqliteTable(
  'factions',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
  },
  (table) => ({
    factions_id_idx: index('factions_id_idx').on(table.id),
    factions_name_idx: index('factions_name_idx').on(table.name),
  }),
);

export const realms = sqliteTable(
  'realms',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    region: text('region', { enum: ['us', 'eu'] }).notNull(),
    version: text('version', { enum: ['classic', 'era'] }).notNull(),
    tag: text('tag', { enum: ['normal', 'hardcore', 'seasonal'] })
      .notNull()
      .default('normal'),
  },
  (table) => ({
    realms_id_idx: index('realms_id_idx').on(table.id),
    realms_name_idx: index('realms_name_idx').on(table.name),
  }),
);
