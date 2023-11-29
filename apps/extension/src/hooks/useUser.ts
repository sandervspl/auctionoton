import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';

function useUser() {
  const { data: user } = useStorageQuery('user');
  const { version } = useIsClassicWowhead();

  // Transfer .server to .realms for backwards compatibility
  if (user?.server) {
    if (!user.realms) {
      user.realms = { ...user.server };
    }

    delete user.server;
  }

  const realm = user?.realms?.[version]?.slug ?? '';

  console.log(user);

  return {
    realm,
    faction: user?.faction[realm.toLowerCase()]?.toLowerCase() ?? '',
    region: user?.region ?? 'eu',
  };
}

export default useUser;
