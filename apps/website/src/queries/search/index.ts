import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';

import { searchItem } from 'actions/search';

const searchQueryOptions = (value: string) => {
  return queryOptions({
    queryKey: ['search', value],
    queryFn: value ? async () => searchItem(value) : skipToken,
  });
};

export const useSearchQuery = (value: string) => {
  return useQuery(searchQueryOptions(value));
};
