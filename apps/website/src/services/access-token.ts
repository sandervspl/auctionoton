import { type JWTVerifyGetKey, createRemoteJWKSet, errors, jwtVerify } from 'jose';

export type AccessSession = {
  userId: string;
  identity: string;
  email: string;
  expiresAt: number;
};

export type AccessConfig = {
  issuer: string;
  audience: string;
  userIdMap?: string;
};

// Only public verification keys are cached. Identities stay request-scoped.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function accessToken(request: Request) {
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (assertion) return assertion;
  return (
    request.headers
      .get('Cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('CF_Authorization='))
      ?.slice('CF_Authorization='.length) || null
  );
}

export function safeReturnTo(value: string | null) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return '/';
  const url = new URL(value, 'https://auctionoton.invalid');
  if (
    url.origin !== 'https://auctionoton.invalid' ||
    /^\/(auth|api|cdn-cgi)(\/|$)/.test(url.pathname)
  )
    return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function verifyAccessSession(
  request: Request,
  config: AccessConfig,
  verificationKeys?: JWTVerifyGetKey,
): Promise<AccessSession | null> {
  const token = accessToken(request);
  if (!token) return null;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.issuer) || !config.audience) {
    throw new Error('Cloudflare Access issuer and audience must be configured.');
  }
  let keys = verificationKeys ?? keySets.get(config.issuer);
  if (!keys) {
    const remoteKeys = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`));
    keySets.set(config.issuer, remoteKeys);
    keys = remoteKeys;
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'email', 'type'],
    });
    if (
      payload.type !== 'app' ||
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      typeof payload.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+$/.test(payload.email) ||
      payload.email_verified === false ||
      payload.iat! > Date.now() / 1000 + 30
    )
      return null;

    const identity = `${config.issuer}#${payload.sub}`;
    // Import only reviewed, verified identity mappings. Never link owners using
    // an email supplied by the browser, or change existing database owner IDs.
    const map: unknown = JSON.parse(config.userIdMap || '{}');
    if (!map || typeof map !== 'object' || Array.isArray(map))
      throw new Error('Invalid Access user ID map.');
    const mapped = Object.hasOwn(map, identity)
      ? (map as Record<string, unknown>)[identity]
      : undefined;
    if (mapped !== undefined && (typeof mapped !== 'string' || !mapped || mapped.length > 256)) {
      throw new Error('Invalid Access user ID mapping.');
    }
    return {
      userId: typeof mapped === 'string' ? mapped : `access:${identity}`,
      identity,
      email: payload.email,
      expiresAt: payload.exp! * 1000,
    };
  } catch (error) {
    if (
      error instanceof errors.JWTClaimValidationFailed ||
      error instanceof errors.JWTExpired ||
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed ||
      error instanceof errors.JOSEAlgNotAllowed ||
      error instanceof errors.JWKSNoMatchingKey
    )
      return null;
    // Certificate outages and configuration failures must not become sign-outs.
    throw error;
  }
}
