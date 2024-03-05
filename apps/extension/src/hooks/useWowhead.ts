import * as i from 'types';

export function useWowhead() {
  let version: i.GameVersion = 'classic';
  if (window.location.href.includes('wowhead.com/classic')) {
    version = 'era';
  }
  const wowheadBaseUrl =
    version === 'era' ? 'https://wowhead.com/classic' : 'https://wowhead.com/wotlk';

  return {
    isEra: version === 'era',
    isWotlk: version === 'classic',
    version,
    wowheadBaseUrl,
  };
}
