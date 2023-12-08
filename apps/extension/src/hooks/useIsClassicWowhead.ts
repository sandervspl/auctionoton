import { getVersion } from 'utils/version';

function useIsClassicWowhead() {
  const isWotlk = window.location.href.includes('wowhead.com/wotlk');
  const isEra = window.location.href.includes('wowhead.com/classic');
  const wowheadBaseUrl = isEra ? 'https://wowhead.com/classic' : 'https://wowhead.com/wotlk';
  const version = getVersion();

  return {
    isEra,
    isWotlk,
    version,
    isClassicWowhead: isEra || isWotlk,
    wowheadBaseUrl,
  };
}

export default useIsClassicWowhead;
