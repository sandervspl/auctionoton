import type { ProviderRealm, ProviderRegion, Region, Version } from './contracts';
import { providerVersions } from './contracts';
import type { Env } from './env';
import { readBoundedText } from './http';
import { providerFetch } from './provider';

const maxCatalogBytes = 2 * 1024 * 1024;
export const realmCatalogLifetime = 60 * 60 * 1000;

// Keep the provider's legacy label: progression Classic still appears as Wrath.
// Prefer newer labels if the provider renames it during an expansion transition.
const progressionLabels = ['Mists of Pandaria', 'Cataclysm', 'Wrath'];

export function selectRealmRegion(catalog: ProviderRegion[], region: Region, version: Version) {
  const labels =
    version === 'classic'
      ? progressionLabels
      : version === 'anniversary'
        ? ['Burning Crusade Anniversary', 'Classic Anniversary', 'Anniversary']
        : version === 'forever'
          ? ['Classic Forever', 'Forever']
          : [providerVersions[version]];
  for (const label of labels) {
    const match = catalog.find(
      (entry) => entry.regionPrefix === region && entry.gameVersion === label,
    );
    if (match) return match;
  }
  // Anniversary has moved from Vanilla to TBC; identify its realms even if
  // the provider still uses an older expansion label. Keep real provider IDs.
  if (version === 'anniversary') {
    const names =
      region === 'eu'
        ? ['Spineshatter', 'Thunderstrike']
        : ['Nightslayer', 'Dreamscythe', 'Maladath'];
    const realms = catalog
      .filter((entry) => entry.regionPrefix === region)
      .flatMap((entry) => entry.realms)
      .filter((realm) => names.includes(realm.name));
    if (realms.length)
      return { regionPrefix: region, gameVersion: providerVersions.anniversary, realms };
  }
  // An unknown provider label is a contract error, not a successful empty list.
  throw new Error(`No provider realm catalog for ${region}/${version}`);
}

export function parseRealmCatalog(value: unknown): { items: ProviderRegion[] } {
  const catalog = value as { items?: ProviderRegion[] } | null;
  if (!catalog || !Array.isArray(catalog.items) || !catalog.items.length)
    throw new Error('Invalid realm catalog');
  for (const region of catalog.items) {
    if (
      !region ||
      typeof region.regionPrefix !== 'string' ||
      typeof region.gameVersion !== 'string' ||
      !Array.isArray(region.realms)
    )
      throw new Error('Invalid realm region');
    for (const realm of region.realms) {
      if (
        !realm ||
        !Number.isSafeInteger(realm.realmId) ||
        realm.realmId <= 0 ||
        typeof realm.name !== 'string' ||
        !realm.name ||
        typeof realm.localizedName !== 'string' ||
        !Array.isArray(realm.auctionHouses) ||
        realm.auctionHouses.some(
          (house) =>
            !house ||
            !Number.isSafeInteger(house.auctionHouseId) ||
            house.auctionHouseId <= 0 ||
            typeof house.type !== 'string' ||
            !Number.isFinite(house.lastModified),
        )
      )
        throw new Error('Invalid realm');
    }
  }
  return { items: catalog.items };
}

export async function getRealms(env: Env, region: Region, version: Version) {
  // The primary TSM credential returns all regions and versions. Secondary pricing
  // credentials can expire independently and must not break realm discovery.
  const key = 'realm-cache/v1/catalog.json';
  const cached = await env.SNAPSHOTS.get(key);
  let catalog: { items: ProviderRegion[] } | undefined;
  if (
    cached &&
    cached.size <= maxCatalogBytes &&
    Date.now() - cached.uploaded.getTime() < realmCatalogLifetime
  ) {
    try {
      catalog = parseRealmCatalog(await cached.json());
    } catch {
      // Replace invalid cache entries with a validated provider response.
    }
  }
  if (!catalog) {
    const response = await providerFetch(
      env,
      'seasonal',
      'https://realm-api.tradeskillmaster.com/realms',
    );
    const body = await readBoundedText(response, maxCatalogBytes);
    catalog = parseRealmCatalog(JSON.parse(body));
    selectRealmRegion(catalog.items, region, version);
    await env.SNAPSHOTS.put(key, JSON.stringify(catalog), {
      httpMetadata: { contentType: 'application/json' },
    });
  }
  return selectRealmRegion(catalog.items, region, version)
    .realms.map(({ name, localizedName, realmId, auctionHouses }: ProviderRealm) => ({
      name,
      localizedName: localizedName || name,
      realmId,
      auctionHouses,
    }))
    .sort((a, b) => a.localizedName.localeCompare(b.localizedName));
}
