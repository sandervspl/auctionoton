// The shared catalog currently comes from Blizzard's Classic Era/SoD namespace.
export const ITEM_ICON_BASE = 'https://render.worldofwarcraft.com/classic1x-eu/icons/56/';
export const FALLBACK_ITEM_ICON = `${ITEM_ICON_BASE}inv_misc_questionmark.jpg`;

export function itemIconUrl(icon: string): string {
  if (/^[a-z0-9_]+$/.test(icon)) return `${ITEM_ICON_BASE}${icon}.jpg`;
  // Preserve existing full URLs while old catalog records are backfilled.
  if (icon.startsWith('https://')) return icon;
  return FALLBACK_ITEM_ICON;
}

export function compactItemIcon(url: string): string {
  if (!url.startsWith(ITEM_ICON_BASE) || !url.endsWith('.jpg'))
    throw new Error('Unexpected Blizzard item icon URL');
  const icon = url.slice(ITEM_ICON_BASE.length, -4);
  if (!/^[a-z0-9_]+$/.test(icon)) throw new Error('Invalid Blizzard item icon name');
  return icon;
}
