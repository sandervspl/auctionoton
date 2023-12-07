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
    items_item_id_auction_house_id_idx: index('items_item_id_auction_house_id_idx').on(
      table.itemId,
      table.auctionHouseId,
    ),
    items_item_id_auction_house_id_unq: unique('items_item_id_auction_house_id_unq').on(
      table.itemId,
      table.auctionHouseId,
    ),
  }),
);

export const insertItemsSchema = createInsertSchema(items);
