import type { D1Database } from '@cloudflare/workers-types';
import { itemIconUrl } from './item-icons';

// Shared by the website's authenticated server functions and workerd integration tests.
// Callers must derive userId from a verified Access session, never from browser input.
export type WebsiteDatabases = {
  MARKET: Pick<D1Database, 'prepare' | 'batch'>;
  USERS: Pick<D1Database, 'prepare' | 'batch'>;
};
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
const joinedMetadataColumns = `m.id, m.name, m.slug, m.locale, m.quality, m.tags,
  m.item_level AS itemLevel, m.required_level AS requiredLevel, m.icon`;
const placeholders = (ids: number[]) => ids.map(() => '?').join(',');

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
    const row = await market
      .prepare(`SELECT ${metadataColumns} FROM item_metadata WHERE id = ?`)
      .bind(id)
      .first<ItemMetadata>();
    return row ? { ...row, icon: itemIconUrl(row.icon) } : undefined;
  }
  async function itemsByIds(itemIds: number[]) {
    const ids = [...new Set(itemIds)];
    const result = new Map<number, ItemMetadata>();
    // Leave room below D1's 100-parameter limit and bound each result set.
    for (let offset = 0; offset < ids.length; offset += 90) {
      const chunk = ids.slice(offset, offset + 90);
      const rows = await market
        .prepare(`SELECT ${metadataColumns} FROM item_metadata
        WHERE id IN (${placeholders(chunk)})`)
        .bind(...chunk)
        .all<ItemMetadata>();
      for (const row of rows.results) result.set(row.id, { ...row, icon: itemIconUrl(row.icon) });
    }
    return result;
  }
  async function history(itemId: number, auctionHouseId: number, region: string) {
    const rows = await market
      .prepare(`SELECT p.min_buyout AS minBuyout, p.quantity,
      p.market_value AS marketValue, p.historical, p.num_auctions AS numAuctions,
      s.fetched_at AS timestamp, m.icon, m.name, m.quality
      FROM snapshots s JOIN prices p ON p.snapshot_id = s.id
      LEFT JOIN item_metadata m ON m.id = p.item_id
      WHERE s.status = 'complete' AND s.house_key = ?
      AND p.item_id = ? AND p.pet_species_id = 0
      AND s.fetched_at > ? ORDER BY s.fetched_at ASC, s.id ASC`)
      .bind(
        `seasonal-${region}-${auctionHouseId}`,
        itemId,
        new Date(Date.now() - 7 * 86400000).toISOString(),
      )
      .all<Price & { icon: string | null; name: string | null; quality: number | null }>();
    return rows.results.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
      icon: row.icon === null ? null : itemIconUrl(row.icon),
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
    async search(input: string) {
      const search = input.trim();
      if (!search) return [];
      if (/^\d+$/.test(search) && Number.isSafeInteger(Number(search))) {
        const exact = await item(Number(search));
        if (exact) return [exact];
      }
      // Prefix LIKE can use the existing NOCASE name index. Only scan for
      // substring matches when the prefix results do not fill the ten slots.
      const term = search.replace(/[\\%_]/g, '\\$&');
      const prefix = `${term}%`;
      const matches = (
        await market
          .prepare(`SELECT ${metadataColumns} FROM item_metadata
        WHERE name LIKE ? ESCAPE '\\' ORDER BY length(name), name, id LIMIT 10`)
          .bind(prefix)
          .all<ItemMetadata>()
      ).results;
      if (matches.length < 10) {
        const remaining = await market
          .prepare(`SELECT ${metadataColumns} FROM item_metadata
          WHERE name LIKE ? ESCAPE '\\' AND name NOT LIKE ? ESCAPE '\\'
          ORDER BY length(name), name, id LIMIT ?`)
          .bind(`%${term}%`, prefix, 10 - matches.length)
          .all<ItemMetadata>();
        matches.push(...remaining.results);
      }
      return matches.map((row) => ({ ...row, icon: itemIconUrl(row.icon) }));
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
      if (!searches.length) return [];
      const ids = searches.map((search) => search.itemId);
      type RecentRow = ItemMetadata & {
        minBuyout: number | null;
        marketValue: number | null;
        quantity: number | null;
        timestamp: string | null;
        priceRank: number | null;
      };
      const rows = await market
        .prepare(`WITH ranked AS (
        SELECT p.item_id, p.min_buyout AS minBuyout, p.market_value AS marketValue,
          p.quantity, s.fetched_at AS timestamp,
          ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY s.fetched_at DESC, s.id DESC) AS priceRank
        FROM snapshots s JOIN prices p ON p.snapshot_id = s.id
        WHERE s.status = 'complete' AND s.house_key = ? AND s.fetched_at > ?
          AND p.pet_species_id = 0 AND p.item_id IN (${placeholders(ids)})
      ) SELECT ${joinedMetadataColumns}, r.minBuyout, r.marketValue, r.quantity, r.timestamp, r.priceRank
        FROM item_metadata m LEFT JOIN ranked r ON r.item_id = m.id AND r.priceRank <= 2
        WHERE m.id IN (${placeholders(ids)}) ORDER BY m.id, r.priceRank`)
        .bind(
          `seasonal-${region}-${auctionHouseId}`,
          new Date(Date.now() - 7 * 86400000).toISOString(),
          ...ids,
          ...ids,
        )
        .all<RecentRow>();
      const byId = new Map<number, RecentRow[]>();
      for (const row of rows.results) byId.set(row.id, [...(byId.get(row.id) ?? []), row]);
      return searches.flatMap((search) => {
        const rows = byId.get(search.itemId);
        const metadata = rows?.[0];
        if (!metadata) return [];
        const current = rows?.find((row) => row.priceRank === 1);
        const previous = rows?.find((row) => row.priceRank === 2);
        return [
          {
            ...search,
            name: metadata.name,
            slug: metadata.slug,
            icon: itemIconUrl(metadata.icon),
            quality: metadata.quality,
            item_id: search.itemId,
            min_buyout: current?.minBuyout ?? undefined,
            market_value: current?.marketValue ?? undefined,
            quantity: current?.quantity ?? undefined,
            item_timestamp: current?.timestamp ?? undefined,
            diffMinBuyout: current && previous ? current.minBuyout! - previous.minBuyout! : 0,
            diffMarketValue: current && previous ? current.marketValue! - previous.marketValue! : 0,
          },
        ];
      });
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
      const metadata = await itemsByIds(entries.map((entry) => entry.itemId));
      const bySection = new Map<number, typeof entries>();
      for (const entry of entries) {
        const group = bySection.get(entry.sectionId) ?? [];
        group.push(entry);
        bySection.set(entry.sectionId, group);
      }
      return sections.map((section) => ({
        ...section,
        items: (bySection.get(section.id) ?? []).flatMap((entry) => {
          const item = metadata.get(entry.itemId);
          if (!item) return [];
          return [
            {
              dashboardSectionId: section.id,
              dashboardSectionItemId: entry.id,
              dashboardSectionItem: {
                id: entry.id,
                itemId: entry.itemId,
                order: entry.order,
                item,
              },
            },
          ];
        }),
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
