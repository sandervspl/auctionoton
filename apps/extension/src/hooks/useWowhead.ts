import * as i from 'types';

export function useWowhead() {
  let version: i.GameVersion = 'classic';
  if (window.location.href.includes('wowhead.com/classic')) {
    version = 'seasonal';
  }
  const wowheadBaseUrl =
    version === 'seasonal' ? 'https://wowhead.com/classic' : 'https://wowhead.com/cata';

  return {
    isEra: version === 'seasonal',
    isClassic: version === 'classic',
    version,
    wowheadBaseUrl,
  };
}
