import * as i from 'types';
import { useQuery } from 'react-query';
import { edgeAPI, EdgeAPI } from 'utils/edgeApi';

type Realm = {
  name: string;
  localizedName: string;
  realmId: number;
};

function useRealmsList(region: i.Regions, version: i.Version) {
  const realms = useQuery<Realm[], Error>({
    queryKey: ['realms', region, version],
    queryFn: async () => {
      const url = new URL(EdgeAPI.RealmsUrl);
      url.searchParams.set('region', region);
      url.searchParams.set('version', version);

      const { data, status, statusText } = await edgeAPI.get<Realm[]>(url.href);

      if (status !== 200) {
        throw new Error(statusText);
      }

      return data;
    },
    enabled: !!region,
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return realms;
}

export default useRealmsList;
