import type { D1Database } from '@cloudflare/workers-types';

// Shared by the website's authenticated server functions and workerd integration tests.
// Callers must derive userId from a verified Access session, never from browser input.
export type WebsiteDatabases = { MARKET: D1Database; USERS: D1Database };
export type ItemMetadata = {
  id: number;
  name: string;
  slug: string;
  locale: string;
  quality: number;
  tags: string;
  itemLevel: number;
  requiredLevel: number;
  icon: string;
};
const metadataColumns = `id, name, slug, locale, quality, tags,
  item_level AS itemLevel, required_level AS requiredLevel, icon`;

type Price = {
  minBuyout: number;
  quantity: number;
  marketValue: number;
  historical: number;
  numAuctions: number;
  timestamp: string;
};

export function websiteData({ MARKET: market, USERS: users }: WebsiteDatabases) {
  async function item(id: number) {
    return (
      (await market
        .prepare(`SELECT ${metadataColumns} FROM item_metadata WHERE id = ?`)
        .bind(id)
        .first<ItemMetadata>()) ?? undefined
    );
  }
  async function history(itemId: number, auctionHouseId: number, region: string) {
    const rows = await market
      .prepare(`SELECT p.min_buyout AS minBuyout, p.quantity,
      p.market_value AS marketValue, p.historical, p.num_auctions AS numAuctions,
      s.fetched_at AS timestamp
      FROM snapshots s JOIN prices p ON p.snapshot_id = s.id
      WHERE s.status = 'complete' AND s.version = 'seasonal' AND s.region = ?
      AND s.auction_house_id = ? AND p.item_id = ? AND p.pet_species_id = 0
      AND s.fetched_at > ? ORDER BY s.fetched_at ASC`)
      .bind(region, auctionHouseId, itemId, new Date(Date.now() - 7 * 86400000).toISOString())
      .all<Price>();
    const metadata = await item(itemId);
    return rows.results.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
      icon: metadata?.icon ?? null,
      name: metadata?.name ?? null,
      quality: metadata?.quality ?? null,
    }));
  }
  async function sectionOwned(userId: string, sectionId: number) {
    const section = await users
      .prepare('SELECT id FROM website_dashboard_sections WHERE id = ? AND user_id = ?')
      .bind(sectionId, userId)
      .first();
    if (!section) throw new Error('Collection not found');
  }
  return {
    item,
    history,
    async itemFromSlug(slug: string) {
      return (
        (await market
          .prepare('SELECT name FROM item_metadata WHERE slug = ? LIMIT 1')
          .bind(slug)
          .first<{ name: string }>()) ?? undefined
      );
    },
    async search(search: string) {
      // Escape LIKE metacharacters: the query is literal, case-insensitive text.
      const term = search.replace(/[\\%_]/g, '\\$&');
      return (
        await market
          .prepare(`SELECT ${metadataColumns} FROM item_metadata
        WHERE name LIKE ? ESCAPE '\\' OR id = ?
        ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 WHEN name LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END,
        length(name), name, id LIMIT 10`)
          .bind(`%${term}%`, /^\d+$/.test(search) ? Number(search) : -1, search, `${term}%`)
          .all<ItemMetadata>()
      ).results;
    },
    async addRecentSearch(userId: string, data: { itemId: number; search: string }) {
      if (!(await item(data.itemId))) throw new Error('Item not found');
      await users.batch([
        users
          .prepare(`INSERT INTO website_recent_searches (user_id, item_id, search, timestamp)
          VALUES (?, ?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET
          search = excluded.search, timestamp = excluded.timestamp`)
          .bind(userId, data.itemId, data.search, new Date().toISOString()),
        users
          .prepare(`DELETE FROM website_recent_searches WHERE user_id = ? AND id NOT IN
          (SELECT id FROM website_recent_searches WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT 10)`)
          .bind(userId, userId),
      ]);
    },
    async recentSearches(userId: string, auctionHouseId: number, region: string) {
      const searches = (
        await users
          .prepare(`SELECT id, item_id AS itemId, search FROM website_recent_searches
        WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT 10`)
          .bind(userId)
          .all<{ id: number; itemId: number; search: string }>()
      ).results;
      const results = await Promise.all(
        searches.map(async (search) => {
          const metadata = await item(search.itemId);
          if (!metadata) return null;
          const prices = await history(search.itemId, auctionHouseId, region);
          const current = prices.at(-1);
          const previous = prices.at(-2);
          return {
            ...search,
            name: metadata.name,
            slug: metadata.slug,
            icon: metadata.icon,
            quality: metadata.quality,
            item_id: search.itemId,
            min_buyout: current?.minBuyout,
            market_value: current?.marketValue,
            quantity: current?.quantity,
            item_timestamp: current?.timestamp.toISOString(),
            diffMinBuyout: current && previous ? current.minBuyout - previous.minBuyout : 0,
            diffMarketValue: current && previous ? current.marketValue - previous.marketValue : 0,
          };
        }),
      );
      return results.filter((result) => result !== null);
    },
    async sections(userId: string) {
      const sections = (
        await users
          .prepare(`SELECT id, user_id AS userId, name, sort_order AS 'order'
        FROM website_dashboard_sections WHERE user_id = ? ORDER BY sort_order, id`)
          .bind(userId)
          .all<{ id: number; userId: string; name: string; order: number }>()
      ).results;
      const entries = (
        await users
          .prepare(`SELECT i.id, i.section_id AS sectionId, i.item_id AS itemId,
        i.sort_order AS 'order' FROM website_dashboard_items i
        JOIN website_dashboard_sections s ON s.id = i.section_id WHERE s.user_id = ? ORDER BY i.sort_order, i.id`)
          .bind(userId)
          .all<{ id: number; sectionId: number; itemId: number; order: number }>()
      ).results;
      const metadata = new Map(
        await Promise.all(
          [...new Set(entries.map((entry) => entry.itemId))].map(
            async (id) => [id, await item(id)] as const,
          ),
        ),
      );
      return sections.map((section) => ({
        ...section,
        items: entries
          .filter(
            (entry) =>
              entry.sectionId === section.id &&
              metadata.has(entry.itemId) &&
              metadata.get(entry.itemId),
          )
          .map((entry) => ({
            dashboardSectionId: section.id,
            dashboardSectionItemId: entry.id,
            dashboardSectionItem: {
              id: entry.id,
              itemId: entry.itemId,
              order: entry.order,
              item: metadata.get(entry.itemId)!,
            },
          })),
      }));
    },
    async createSection(userId: string, name: string) {
      await users
        .prepare(`INSERT INTO website_dashboard_sections (user_id, name, sort_order)
        SELECT ?, ?, COALESCE(MAX(sort_order), -1) + 1 FROM website_dashboard_sections WHERE user_id = ?`)
        .bind(userId, name, userId)
        .run();
    },
    async addSectionItem(userId: string, sectionId: number, itemId: number) {
      await sectionOwned(userId, sectionId);
      if (!(await item(itemId))) throw new Error('Item not found');
      // Ownership and ordering are checked within the write, including concurrent requests.
      await users
        .prepare(`INSERT INTO website_dashboard_items (section_id, item_id, sort_order)
        SELECT s.id, ?, COALESCE((SELECT MAX(sort_order) FROM website_dashboard_items WHERE section_id = s.id), -1) + 1
        FROM website_dashboard_sections s WHERE s.id = ? AND s.user_id = ?
        ON CONFLICT(section_id, item_id) DO NOTHING`)
        .bind(itemId, sectionId, userId)
        .run();
    },
    async deleteSection(userId: string, sectionId: number) {
      const result = await users
        .prepare('DELETE FROM website_dashboard_sections WHERE id = ? AND user_id = ?')
        .bind(sectionId, userId)
        .run();
      if (!result.meta.changes) throw new Error('Collection not found');
    },
    async deleteSectionItem(userId: string, sectionId: number, itemId: number) {
      const result = await users
        .prepare(`DELETE FROM website_dashboard_items WHERE id = ? AND section_id = ?
        AND section_id IN (SELECT id FROM website_dashboard_sections WHERE user_id = ?)`)
        .bind(itemId, sectionId, userId)
        .run();
      if (!result.meta.changes) throw new Error('Collection item not found');
    },
  };
}
