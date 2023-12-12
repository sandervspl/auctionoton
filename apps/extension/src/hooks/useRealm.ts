import useIsClassicWowhead from './useIsClassicWowhead';
import useStorageQuery from './useStorageQuery';

export function useRealm() {
  const { data: user } = useStorageQuery('user');
  const { isEra } = useIsClassicWowhead();
  const activeVersion = user?.isActive?.[isEra ? 'era' : 'classic'];
  const activeRealm = activeVersion && user.realms?.[activeVersion];

  return {
    activeVersion,
    activeRealm,
  };
}
