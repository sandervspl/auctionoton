import { betterAuth } from 'better-auth';
import type { Env } from './env';

export function createAuth(env: Env, allowRegistration = false) {
  return betterAuth({
    appName: 'Auctionoton staging',
    baseURL: env.BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.USERS,
    emailAndPassword: { enabled: true, minPasswordLength: 12, disableSignUp: !allowRegistration },
    session: { cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database' },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
  });
}
