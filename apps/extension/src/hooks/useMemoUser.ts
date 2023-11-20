import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';

function useMemoUser() {
  const { data: user } = useStorageQuery('user');
  const isClassicWowhead = useIsClassicWowhead();

  const server = isClassicWowhead ? user?.server.classic?.slug ?? '' : '';

  return {
    server,
    faction: user?.faction[server.toLowerCase()]?.toLowerCase() ?? '',
    region: user?.region ?? '',
  };
}

export default useMemoUser;
