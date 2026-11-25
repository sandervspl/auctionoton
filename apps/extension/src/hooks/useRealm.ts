import { activeVersion as pageVersion } from '@/utils/gameVersions';
import { useWowhead } from './useWowhead';
import useStorageQuery from './useStorageQuery';

export function useRealm() {
  const { data: user } = useStorageQuery('user');
  const activeVersion = pageVersion(user?.isActive, useWowhead());
  const activeRealm = user?.realms?.[activeVersion];

  return {
    activeVersion,
    activeRealm,
  };
}
