import { wowheadContext } from '@/utils/gameVersions';

export function useWowhead() {
  return wowheadContext(window.location.pathname);
}
