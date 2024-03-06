import * as i from 'types';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const fetchUser = async (id?: string) => {
  if (!id) {
    return null;
  }

  return {
    id,
    name: 'John Doe',
  } as i.User;
};

export const userQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: ['user', id],
    queryFn: async () => fetchUser(id),
    enabled: Boolean(id),
  });

export const useGetUser = (userId?: string) => {
  return useQuery(userQueryOptions(userId));
};
