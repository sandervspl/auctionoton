export async function signOutOfAccess(fetcher: typeof fetch = fetch) {
  const error = 'Could not sign out. Please try again.';
  const response = await fetcher('/api/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(error);

  // Let Access revoke the session and expire its HttpOnly cookies, but do not
  // follow its redirect back to the protected login route. Browsers still apply
  // Set-Cookie when a credentialed fetch returns an opaque manual redirect.
  const logout = await fetcher('/cdn-cgi/access/logout', {
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'manual',
  });
  if (!logout.ok && logout.type !== 'opaqueredirect') throw new Error(error);

  // Access can return an HTML error with status 200. Confirm the cookie is gone
  // before telling other tabs that sign-out succeeded or navigating away.
  const session = await fetcher('/api/session', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (session.status !== 401) throw new Error(error);
  const body = await session.json();
  if (!body || typeof body !== 'object' || !('session' in body) || body.session !== null) {
    throw new Error(error);
  }
}
