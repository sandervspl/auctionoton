import useStorageQuery from './useStorageQuery';
import { useWowhead } from './useWowhead';

function useUser() {
  const { data: user } = useStorageQuery('user');
  const { version, group } = useWowhead();
  const activeVersion = user?.isActive?.[group] || version;

  // Transfer .server to .realms for backwards compatibility
  if (user?.server) {
    if (!user.realms) {
      user.realms = { ...user.server } as any;
    }

    // biome-ignore lint/performance/noDelete: Remove the legacy field after migrating stored settings.
    delete user.server;
  }

  const realm = user?.realms?.[activeVersion];

  return {
    ...user,
    realm: realm,
    faction: realm?.name ? user?.faction[realm.name]?.toLowerCase() : '',
    region: user?.region ?? 'eu',
  };
}

export default useUser;
