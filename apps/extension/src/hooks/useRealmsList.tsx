import * as i from 'types';
import { useQuery } from '@tanstack/react-query';
import { auctionotonAPI, auctionotonAPIUrl } from 'utils';
import { parseRealms } from '@/utils/realms';

function useRealmsList(region: i.Regions | undefined, version: i.GameVersion | undefined) {
  return useQuery({
    queryKey: ['realms', region, version],
    queryFn: async ({ signal }) => {
      const { data } = await auctionotonAPI.get<unknown>(
        `${auctionotonAPIUrl}/realms/${region}/${version}`,
        { signal, timeout: 30_000 },
      );
      return parseRealms(data);
    },
    enabled: !!region && !!version,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

export default useRealmsList;
