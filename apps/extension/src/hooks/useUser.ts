import useStorageQuery from './useStorageQuery';
import { useWowhead } from './useWowhead';

function useUser() {
  const { data: user } = useStorageQuery('user');
  const { version } = useWowhead();
  const activeVersion = user?.isActive?.[version] || version;

  // Transfer .server to .realms for backwards compatibility
  if (user?.server) {
    if (!user.realms) {
      user.realms = { ...user.server } as any;
    }

    delete user.server;
  }

  const realm = user?.realms?.[activeVersion];

  return {
    realm: realm,
    faction: realm?.name ? user?.faction[realm.name]?.toLowerCase() : '',
    region: user?.region ?? 'eu',
  };
}

export default useUser;
