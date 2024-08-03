import {
  text,
  integer,
  pgTable,
  unique,
  index,
  bigserial,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const items = pgTable(
  'items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    auctionHouseId: integer('auction_house_id').notNull(),
    itemId: integer('item_id').notNull(),
    petSpeciesId: integer('pet_species_id'),
    minBuyout: numeric('min_buyout').notNull(),
    quantity: integer('quantity').notNull(),
    marketValue: integer('market_value').notNull(),
    historical: integer('historical').notNull(),
    numAuctions: integer('num_auctions').notNull(),
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    auction_house_id_idx: index('items_item_id_auction_house_id_ts_idx').on(
      table.itemId,
      table.auctionHouseId,
      table.timestamp,
    ),
  }),
);

export const insertItemsSchema = createInsertSchema(items);

export const itemsMetadata = pgTable(
  'items_metadata',
  {
    id: bigserial('id', { mode: 'number' }).notNull(),
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
