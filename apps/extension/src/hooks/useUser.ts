import { activeVersion as pageVersion } from '@/utils/gameVersions';
import useStorageQuery from './useStorageQuery';
import { useWowhead } from './useWowhead';

function useUser() {
  const { data: user } = useStorageQuery('user');
  const activeVersion = pageVersion(user?.isActive, useWowhead());

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
