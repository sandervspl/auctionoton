import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

export function useServerMutation<TInput, TOutput>(
  serverFn: (options: { data: TInput }) => Promise<TOutput>,
) {
  const router = useRouter();
  const mutate = useServerFn(serverFn);
  return useMutation({
    mutationFn: (data: TInput) => mutate({ data }),
    onSuccess: () => router.invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });
}
