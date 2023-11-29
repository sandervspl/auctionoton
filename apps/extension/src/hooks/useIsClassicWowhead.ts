import { getVersion } from 'utils/version';

function useIsClassicWowhead() {
  const isWotlk = window.location.href.includes('wowhead.com/wotlk');
  const isEra = window.location.href.includes('wowhead.com/classic');
  const version = getVersion();

  return {
    isEra,
    isWotlk,
    version,
    isClassicWowhead: isEra || isWotlk,
  };
}

export default useIsClassicWowhead;
