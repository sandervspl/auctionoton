import * as i from 'types';
import { useQuery } from '@tanstack/react-query';

import { edgeAPI, EdgeAPI } from 'utils/edgeApi';

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

function useRealmsList(region: i.Regions, version: i.Version) {
  const realms = useQuery<Realm[], Error>({
    queryKey: ['realms', region, version],
    queryFn: async () => {
      const { data, status, statusText } = await edgeAPI.get<Realm[]>(EdgeAPI.RealmsUrl, {
        params: {
          region,
          version,
        },
      });

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
