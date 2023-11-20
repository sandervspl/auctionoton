function useIsClassicWowhead(): boolean {
  return window.location.href.includes('wowhead.com/wotlk');
}

export default useIsClassicWowhead;
