import { useWowhead } from './useWowhead';
import useStorageQuery from './useStorageQuery';

export function useRealm() {
  const { data: user } = useStorageQuery('user');
  const { group, version } = useWowhead();
  const activeVersion = user?.isActive?.[group] ?? version;
  const activeRealm = user?.realms?.[activeVersion];

  return {
    activeVersion,
    activeRealm,
  };
}
