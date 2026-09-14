import { useLocation } from '@tanstack/react-router';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { AccessSession } from 'services/access-token';
import { Button } from 'shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'shadcn-ui/dialog';

type AuthState = {
  session: AccessSession | null;
  error: string;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AccessProvider({
  children,
  initialSession,
}: { children: ReactNode; initialSession: AccessSession | null }) {
  const [session, setSession] = useState(initialSession);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    generation.current++;
    inFlight.current = null;
    setSession(initialSession);
  }, [initialSession]);

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const startedAt = generation.current;
    const request = (async () => {
      try {
        const response = await fetch('/api/session', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok && response.status !== 401)
          throw new Error('Could not refresh sign-in. Please try again.');
        const body = (await response.json()) as { session: AccessSession | null };
        if (generation.current !== startedAt) return;
        setSession(body.session);
        setError('');
      } catch {
        if (generation.current === startedAt)
          setError('Could not refresh sign-in. Please try again.');
      }
    })();
    inFlight.current = request;
    void request.finally(() => {
      if (inFlight.current === request) inFlight.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    const messages =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auctionoton-session') : null;
    channel.current = messages;
    if (messages)
      messages.onmessage = (event) => {
        if (event.data === 'signed-out') {
          generation.current++;
          inFlight.current = null;
          setSession(null);
        }
      };
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(onFocus, 60_000);
    return () => {
      generation.current++;
      inFlight.current = null;
      messages?.close();
      channel.current = null;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setSession(null);
        void refresh();
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session, refresh]);

  async function signOut() {
    const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not sign out. Please try again.');
    generation.current++;
    inFlight.current = null;
    setSession(null);
    channel.current?.postMessage('signed-out');
    window.location.assign('/cdn-cgi/access/logout');
  }

  return (
    <AuthContext.Provider value={{ session, error, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAccessAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AccessProvider is missing.');
  return auth;
}

export function SignInOptions() {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.href);
  return (
    <div className="grid gap-3">
      <Button asChild variant="outline" className="min-h-11">
        <a href={`/auth/google?returnTo=${returnTo}`}>Continue with Google</a>
      </Button>
      <Button asChild variant="outline" className="min-h-11">
        <a href={`/auth/login?returnTo=${returnTo}`}>Continue with email and password</a>
      </Button>
    </div>
  );
}

export function SignInLink() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Sign in</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle>Sign in to Auctionoton</DialogTitle>
          <DialogDescription>Choose how you’d like to sign in.</DialogDescription>
        </DialogHeader>
        <SignInOptions />
      </DialogContent>
    </Dialog>
  );
}

export function AccountButton() {
  const { session, error: sessionError, signOut } = useAccessAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={pending}
        title={session?.email}
        onClick={async () => {
          setPending(true);
          setError('');
          try {
            await signOut();
          } catch {
            setError('Could not sign out. Please try again.');
            setPending(false);
          }
        }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {(error || sessionError) && (
        <output className="text-xs text-destructive">{error || sessionError}</output>
      )}
    </div>
  );
}
