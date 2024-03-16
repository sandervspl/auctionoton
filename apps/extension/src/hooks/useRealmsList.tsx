import * as i from 'types';
import { useQuery } from '@tanstack/react-query';

import { auctionotonAPI, auctionotonAPIUrl } from 'utils/auctionotonApi';

type Realm = {
  name: string;
  localizedName: string;
  realmId: number;
  auctionHouses: {
    auctionHouseId: number;
    type: 'Alliance' | 'Horde';
    lastModified: number;
  }[];
};

function useRealmsList(region: i.Regions, version: i.GameVersion) {
  const realms = useQuery<Realm[], Error>({
    queryKey: ['realms', region, version],
    queryFn: async () => {
      const { data, status, statusText } = await auctionotonAPI.get<Realm[]>(
        `${auctionotonAPIUrl}/realms/${region}/${version}`,
      );

      if (status !== 200) {
        throw new Error(statusText);
      }

      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (err) {
          console.error(err);
          return [];
        }
      }

      return data;
    },
    enabled: !!region,
    gcTime: Infinity,
    staleTime: Infinity,
  });

  return realms;
}

export default useRealmsList;
