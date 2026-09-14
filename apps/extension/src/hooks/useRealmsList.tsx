import * as i from 'types';
import { useQuery } from '@tanstack/react-query';
import { auctionotonAPI, auctionotonAPIUrl } from 'utils';
import { foreverRealms, isVersionAvailable } from '@/utils/gameVersions';
import { parseRealms } from '@/utils/realms';

function useRealmsList(region: i.Regions | undefined, version: i.GameVersion | undefined) {
  return useQuery({
    queryKey: ['realms', region, version],
    queryFn: async ({ signal }) => {
      const { data } = await auctionotonAPI.get<unknown>(
        `${auctionotonAPIUrl}/realms/${region}/${version}`,
        { signal, timeout: 30_000 },
      );
      const realms = parseRealms(data);
      return version === 'forever'
        ? realms.filter((realm) =>
            foreverRealms.some((name) => name.toLowerCase() === realm.name.toLowerCase()),
          )
        : realms;
    },
    enabled: !!region && !!version && isVersionAvailable(version),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

export default useRealmsList;
