// Item icons are stored compactly. Blizzard serves each item catalog's images from its own path:
// Classic Era names like `inv_misc_herb_blacklotus` are stored bare, other catalogs with a prefix
// (`classicann:inv_boots_09`, `forever:134231`).
const RENDER_BASE = 'https://render.worldofwarcraft.com/';
export const ITEM_ICON_BASE = `${RENDER_BASE}classic1x-eu/icons/56/`;
export const FALLBACK_ITEM_ICON = `${ITEM_ICON_BASE}inv_misc_questionmark.jpg`;
const iconCatalogs = ['classic1x', 'classicann', 'forever'] as const;
const COMPACT_ICON = /^(?:(classicann|forever):)?([a-z0-9_]+)$/;

export const isCompactItemIcon = (icon: string) => COMPACT_ICON.test(icon);

export function itemIconUrl(icon: string): string {
  const match = COMPACT_ICON.exec(icon);
  if (match) return `${RENDER_BASE}${match[1] ?? 'classic1x'}-eu/icons/56/${match[2]}.jpg`;
  // Preserve existing full URLs while old catalog records are backfilled.
  if (icon.startsWith('https://')) return icon;
  return FALLBACK_ITEM_ICON;
}

export function compactItemIcon(url: string): string {
  const match =
    /^https:\/\/render\.worldofwarcraft\.com\/([a-z0-9]+)-eu\/icons\/56\/([a-z0-9_]+)\.jpg$/.exec(
      url,
    );
  const catalog = match?.[1] as (typeof iconCatalogs)[number] | undefined;
  if (!match || !catalog || !iconCatalogs.includes(catalog))
    throw new Error('Unexpected Blizzard item icon URL');
  return catalog === 'classic1x' ? match[2]! : `${catalog}:${match[2]}`;
}
