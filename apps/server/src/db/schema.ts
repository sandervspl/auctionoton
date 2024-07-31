import { relations } from 'drizzle-orm';
import {
  text,
  integer,
  pgTable,
  unique,
  index,
  bigserial,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const items = pgTable(
  'items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    auctionHouseId: integer('auction_house_id').notNull(),
    itemId: integer('item_id').notNull(),
    petSpeciesId: integer('pet_species_id'),
    minBuyout: integer('min_buyout').notNull(),
    quantity: integer('quantity').notNull(),
    marketValue: integer('market_value').notNull(),
    historical: integer('historical').notNull(),
    numAuctions: integer('num_auctions').notNull(),
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    item_id_idx: index('items_item_id_idx').on(table.itemId),
    item_id_auction_house_id_idx: index('items_item_id_auction_house_id_idx').on(
      table.itemId,
      table.auctionHouseId,
    ),
    auction_house_id_ts_idx: index('items_auction_house_id_ts_idx').on(
      table.auctionHouseId,
      table.timestamp,
    ),
  }),
);

export const itemsMetadata = pgTable(
  'items_metadata',
  {
    id: bigserial('id', { mode: 'number' }).notNull().unique(),
    name: text('name').default(''),
    slug: text('slug').default(''),
    locale: text('locale').default('en_US'),
    quality: integer('quality').default(1),
    tags: text('tags').default(''),
    itemLevel: integer('item_level').default(0),
    requiredLevel: integer('required_level').default(0),
    icon: text('icon').default(
      'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg',
    ),
  },
  (table) => ({
    id_idx: index('items_metadata_id_idx').on(table.id),
    name_idx: index('items_metadata_name_idx').on(table.name),
    slug_idx: index('items_metadata_slug_idx').on(table.slug),
  }),
);

export const recentSearches = pgTable('recent_searches', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: integer('item_id')
    .unique()
    .notNull()
    .references(() => itemsMetadata.id),
  search: text('search').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  userId: text('user_id').notNull(),
});

export const dashboardSections = pgTable('dashboard_sections', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  userId: text('user_id').notNull(),
});

export const dashboardSectionRelations = relations(dashboardSections, ({ many }) => ({
  items: many(dashboardSectionsSectionItems),
}));

export const dashboardSectionItems = pgTable('dashboard_section_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => itemsMetadata.id),
  order: integer('order').notNull(),
});

export const dashboardSectionItemsRelations = relations(dashboardSectionItems, ({ many, one }) => ({
  items: many(dashboardSectionsSectionItems),
  item: one(itemsMetadata, {
    fields: [dashboardSectionItems.itemId],
    references: [itemsMetadata.id],
  }),
}));

export const dashboardSectionsSectionItems = pgTable(
  'dashboard_sections_section_items',
  {
    dashboardSectionId: integer('dashboard_section_id')
      .notNull()
      .references(() => dashboardSections.id),
    dashboardSectionItemId: integer('dashboard_section_item_id')
      .notNull()
      .references(() => dashboardSectionItems.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dashboardSectionId, table.dashboardSectionItemId] }),
  }),
);

export const dashboardSectionsToSectionItemsRelations = relations(
  dashboardSectionsSectionItems,
  ({ one }) => ({
    dashboardSection: one(dashboardSections, {
      fields: [dashboardSectionsSectionItems.dashboardSectionId],
      references: [dashboardSections.id],
    }),
    dashboardSectionItem: one(dashboardSectionItems, {
      fields: [dashboardSectionsSectionItems.dashboardSectionItemId],
      references: [dashboardSectionItems.id],
    }),
  }),
);
