import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, unique, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';

export const items = sqliteTable(
  'items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    auctionHouseId: integer('auction_house_id').notNull(),
    itemId: integer('item_id').notNull(),
    petSpeciesId: integer('pet_species_id'),
    minBuyout: integer('min_buyout').notNull(),
    quantity: integer('quantity').notNull(),
    marketValue: integer('market_value').notNull(),
    historical: integer('historical').notNull(),
    numAuctions: integer('num_auctions').notNull(),
    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    auction_house_id_idx: index('items_item_id_auction_house_id_idx').on(
      table.itemId,
      table.auctionHouseId,
    ),
    auction_house_id_unq: unique('items_item_id_auction_house_id_unq').on(
      table.itemId,
      table.auctionHouseId,
    ),
  }),
);

export const insertItemsSchema = createInsertSchema(items);

export const itemsMetadata = sqliteTable(
  'items_metadata',
  {
    id: integer('id').notNull(),
    name: text('name').default(''),
    slug: text('slug').default(''),
    locale: text('locale').default('en_US'),
    quality: integer('quality').default(1),
    tags: text('tags').default(''),
    itemLevel: integer('item_level').default(0),
    requiredLevel: integer('required_level').default(0),
  },
  (table) => ({
    id_idx: index('items_metadata_id_idx').on(table.id),
    id_locale_idx: index('items_metadata_id_locale_idx').on(table.id, table.locale),
    id_unq: unique('items_metadata_id_unq').on(table.id),
  }),
);

export const insertItemsMetadataSchema = createInsertSchema(itemsMetadata);
