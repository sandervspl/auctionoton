import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';

function useMemoUser(): { server: string; faction: string; version: string; region: string } {
  const { data: user } = useStorageQuery('user');
  const isClassicWowhead = useIsClassicWowhead();

  const server = isClassicWowhead
    ? user?.server.classic?.slug ?? ''
    : user?.server.retail?.name ?? '';

  return {
    server,
    faction: user?.faction[server.toLowerCase()]?.toLowerCase() ?? '',
    version: user?.version ?? '',
    region: user?.region ?? '',
  };
}

export default useMemoUser;
