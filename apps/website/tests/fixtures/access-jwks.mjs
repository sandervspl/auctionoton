// Loaded only by the smoke-test child process, never by the website bundle.
// Exercise production JWT verification with a real key pair without Google login.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === 'https://test-team.cloudflareaccess.com/cdn-cgi/access/certs') {
    return Promise.resolve(Response.json(JSON.parse(process.env.ACCESS_TEST_JWKS)));
  }
  return originalFetch(input, init);
};
