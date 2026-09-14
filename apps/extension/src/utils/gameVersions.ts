import type { GameVersion } from '../types/index';

export const foreverReleaseDate = new Date('2026-11-04T00:00:00Z').getTime();
export const foreverRealms = ['Normal', 'PvP', 'RP', 'Hardcore'] as const;

export function isVersionAvailable(version: GameVersion, now = Date.now()) {
  return version !== 'forever' || now >= foreverReleaseDate;
}

export function versionGroup(version: GameVersion) {
  return version === 'classic' || version === 'anniversary' ? version : 'era';
}

export function wowheadContext(pathname: string) {
  const segment = pathname.split('/')[1];
  const version =
    segment === 'classic' ? 'seasonal' : segment === 'tbc' ? 'anniversary' : 'classic';
  const path =
    version === 'seasonal' ? 'classic' : version === 'anniversary' ? 'tbc' : 'mop-classic';
  return {
    isEra: version === 'seasonal',
    isClassic: version === 'classic',
    version,
    group: versionGroup(version),
    wowheadBaseUrl: `https://wowhead.com/${path}`,
  } as const;
}
