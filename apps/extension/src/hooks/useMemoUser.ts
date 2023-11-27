import * as i from 'types';

import useStorageQuery from './useStorageQuery';
import useIsClassicWowhead from './useIsClassicWowhead';

function useMemoUser() {
  const { data: user } = useStorageQuery('user');
  const { isClassicWowhead, version } = useIsClassicWowhead();

  const realm = isClassicWowhead ? user?.realms?.[version]?.slug ?? '' : '';

  return {
    realm,
    faction: user?.faction[realm.toLowerCase()]?.toLowerCase() ?? '',
    region: user?.region ?? ('' as i.Regions),
  };
}

export default useMemoUser;
