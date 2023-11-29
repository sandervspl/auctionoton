import * as i from 'types';

import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';

function useMemoUser() {
  const { data: user } = useStorageQuery('user');
  const { isClassicWowhead, version } = useIsClassicWowhead();

  // Transfer .server to .realms for backwards compatibility
  if (user?.server) {
    if (!user.realms) {
      user.realms = { ...user.server };
    }

    delete user.server;
  }

  const realm = isClassicWowhead ? user?.realms?.[version]?.slug ?? '' : '';

  return {
    realm,
    faction: user?.faction[realm.toLowerCase()]?.toLowerCase() ?? '',
    region: user?.region ?? ('' as i.Regions),
  };
}

export default useMemoUser;
