import * as i from 'types';
import { useQuery } from 'react-query';
import { edgeAPI, EdgeAPI } from 'utils/edgeApi';

type Realm = {
  id: number;
  name: string;
  region: i.Regions;
  version: i.Version;
  tag: 'normal' | 'era' | 'hardcore' | 'seasonal';
};

function useRealmsList(region: i.Regions, version: i.Version) {
  const realms = useQuery<Realm[], Error>({
    queryKey: ['realms', region, version],
    queryFn: async () => {
      const { data, status, statusText } = await edgeAPI.get<Realm[]>(EdgeAPI.RealmsUrl);

      if (status !== 200) {
        throw new Error(statusText);
      }

      return data;
    },
    cacheTime: Infinity,
    staleTime: Infinity,
    enabled: !!region && !!version,
  });

  return realms;
}

export default useRealmsList;
