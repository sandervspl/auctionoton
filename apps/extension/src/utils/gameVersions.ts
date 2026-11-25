import type { GameVersion } from '../types/index';

export const foreverReleaseDate = new Date('2026-11-04T00:00:00Z').getTime();

export function isVersionReleased(version: GameVersion, now = Date.now()) {
  return version !== 'forever' || now >= foreverReleaseDate;
}

// Realms come from the backend's fixed catalog, so a released version is always selectable.
export function isVersionAvailable(version: GameVersion, now = Date.now()) {
  return isVersionReleased(version, now);
}

// Each Wowhead site has its own realm setting. Era, Season of Discovery and Hardcore share
// /classic pages, so the popup's last choice among them decides which realm those pages use.
export function versionGroup(version: GameVersion) {
  return version === 'classic' || version === 'anniversary' || version === 'forever'
    ? version
    : 'era';
}

/** The version whose realm a Wowhead page uses, ignoring stored choices from another site. */
export function activeVersion(
  isActive: Partial<Record<ReturnType<typeof versionGroup>, GameVersion>> | undefined,
  context: { group: ReturnType<typeof versionGroup>; version: GameVersion },
): GameVersion {
  const stored = isActive?.[context.group];
  return stored && versionGroup(stored) === context.group ? stored : context.version;
}

export function wowheadContext(pathname: string) {
  const segment = pathname.split('/')[1];
  const version: GameVersion =
    segment === 'classic'
      ? 'seasonal'
      : segment === 'tbc'
        ? 'anniversary'
        : segment === 'forever'
          ? 'forever'
          : 'classic';
  const path = { seasonal: 'classic', anniversary: 'tbc', forever: 'forever' }[version as string];
  return {
    // Daily-imported markets: freshness is judged on a 24-hour scale.
    isEra: version === 'seasonal' || version === 'forever',
    isClassic: version === 'classic',
    version,
    group: versionGroup(version),
    wowheadBaseUrl: `https://wowhead.com/${path ?? 'mop-classic'}`,
  } as const;
}
