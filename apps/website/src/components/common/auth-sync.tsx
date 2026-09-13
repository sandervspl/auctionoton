import { useAuth } from '@clerk/tanstack-react-start';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

export function AuthSync() {
  const { isLoaded, sessionId } = useAuth();
  const previousSession = useRef(sessionId);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || previousSession.current === sessionId) return;
    previousSession.current = sessionId;
    queryClient.clear();
    router.clearCache();
    void router.invalidate();
  }, [isLoaded, sessionId, queryClient, router]);

  return null;
}
