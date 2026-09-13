import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAccessAuth } from './access-auth';

export function AuthSync() {
  const { session } = useAccessAuth();
  const sessionId = session?.userId ?? null;
  const previousSession = useRef(sessionId);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (previousSession.current === sessionId) return;
    previousSession.current = sessionId;
    queryClient.clear();
    router.clearCache();
    void router.invalidate();
  }, [sessionId, queryClient, router]);

  return null;
}
