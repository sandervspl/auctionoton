function useIsClassicWowhead() {
  const isWotlk = window.location.href.includes('wowhead.com/wotlk');
  const isEra = window.location.href.includes('wowhead.com/classic');

  return {
    isWotlk,
    isEra,
    isClassicWowhead: isEra || isWotlk,
  };
}

export default useIsClassicWowhead;
