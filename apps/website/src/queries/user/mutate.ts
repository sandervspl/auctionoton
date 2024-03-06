import * as i from 'types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userQueryOptions } from '.';

export const updateUser = (values: i.UpdateUserPayload) => {
  return {
    id: values.id,
    name: values.name,
  };
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<i.UpdateUserPayload, Error, i.UpdateUserPayload>({
    mutationFn: async (data) => updateUser(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(userQueryOptions(data.id));
    },
  });
};
