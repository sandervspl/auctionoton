# Cloudflare Access migration

Updated 2026-09-13. The selected methods are **Google OAuth and permanent email/password**. Clerk has been removed from the website source and dependencies. The replacement follows Bingo's public website plus Access-protected login entrypoint. Both identity environments and their Access applications are deployed, and the staging website uses Access. A disposable staging password account completed the live browser → Access → identity Worker → Access → website flow, including signed-in SSR and a verified `/api/session` response. Production traffic and user data have not been cut over.

## Password identity service

Access delegates password authentication to an OIDC service hosted on Cloudflare Workers and D1 in `../cloudflare-infra/auctionoton-auth`. Cloudflare Email Sending delivers verification and recovery links. Email verification is mandatory; these emails support permanent passwords and are not one-time-code login. Each environment has an independent identity Worker/database, client secret, signing keys, Access provider, reusable policy, and application audience. Google uses the account's existing provider. The account's one-time PIN provider and all other login methods are excluded. [Access OIDC integration](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/)

The service uses pinned Better Auth 1.7.4 and its OAuth Provider plugin. It provides registration, verified email, password recovery, server-side sessions, RS256 signing, and an authorization-code flow with mandatory PKCE and an exact Access callback. Public client registration and refresh grants are disabled. Browser writes require the exact same origin, request bodies are bounded, and authentication/account-email endpoints are rate limited. Short OAuth requests can expire while a user verifies email; verification uses a clean callback and the login UI provides a fresh Access restart link.

The email domain `accounts.auctionoton.sandervspl.dev` was enabled on 2026-09-13. Its required MX, SPF, DKIM, and DMARC records resolve publicly; the account reports a 1,000-message daily quota. Tests capture delivery through a simulated binding. This confirms the code and DNS configuration, not delivery to a real inbox.

## Resource ownership and request flow

Access applications, per-environment reusable policies, and password identity infrastructure live in `../cloudflare-infra`. Terraform owns the password Workers/D1/IdPs; Alchemy owns the application website/API Workers, market databases, R2, Queues, Workflows, and Durable Objects. Each resource has one deployment owner.

| Environment | Access-protected entrypoint | Audience |
| --- | --- | --- |
| Production | `auctionoton.sandervspl.dev/auth/*` | `auctionoton_access_audiences.production` |
| Staging | `auctionoton-staging-website.sandervispoel.workers.dev/auth/*` | `auctionoton_access_audiences.staging` |

Like Bingo, the website is public and its sign-in link opens `/auth/login`. Access authenticates the visitor, then the route verifies the application JWT and returns to a validated local path. Cookies are HttpOnly, SameSite=Lax, and scoped to the host so server functions and `/api/session` receive them. `/auth/*` protection does not authorize other routes by itself.

The website verifies RS256 signature, the configured issuer and environment audience, expiry, issue time, application token type, subject, and email. It accepts Access's assertion header or browser cookie, never an unsigned email header. Keys refresh through Access's certificate endpoint. Certificate-service errors return 503 instead of silently logging users out. Private responses are `private, no-store`; browsers receive the profile and expiry, never the raw JWT. Dashboard reads and mutations retain their ownership checks. [JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

Sign-out requires a same-origin POST, invalidates pending client refreshes, notifies other tabs, then visits `/cdn-cgi/access/logout` with the cookie intact so Cloudflare can revoke the Access session and clear its cookie. Clearing the cookie before that handoff prevents Cloudflare from identifying the session. Cloudflare logout applies across that user’s Access applications; the password-provider session is separate. [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/) Local JWT verification accepts a copied token until its expiry; immediate server-side revocation is not implemented by this Bingo-style pattern. Do not claim that clearing a browser cookie revokes all copied tokens.

## Preserve existing dashboard ownership

Existing PostgreSQL `dashboard_sections.user_id` and `recent_searches.user_id` contain Clerk IDs. They must remain associated with their owners. New identities default to `access:<issuer>#<subject>`. Before production cutover, set the optional server-side `CLOUDFLARE_ACCESS_USER_ID_MAP` to reviewed mappings from verified `<issuer>#<subject>` to each existing owner ID. All authenticated queries and mutations use that resolved ID.

Example shape, using placeholders only:

```json
{"https://TEAM.cloudflareaccess.com#ACCESS_SUBJECT":"user_EXISTING_OWNER_ID"}
```

Export the old user's verified identity from Clerk, obtain the corresponding verified Access identity, and reconcile against database owners. Ambiguous or unverified matches need an explicit recovery process. A browser-supplied email never links accounts. The same email on a different subject does not automatically inherit ownership. Use separate maps per environment and retain reviewed mappings through the later D1 data import. Do not delete Clerk or its identity export before reconciliation.

The existing PostgreSQL connection remains unreachable, so owner reconciliation and authenticated database CRUD have not been verified. The map mechanism is implemented and tested, but no production mappings have been imported.

## Deployment and validation

1. In `cloudflare-infra`, install the identity package. Use `init-secrets` only for the first deployment; subsequent checkouts must restore the existing secrets. Run `node --env-file=.env scripts/auctionoton.mjs plan` and `apply`. The runner verifies the Worker and a scoped Terraform plan containing only Auctionoton resources. Full Terraform applies currently include unrelated Wowvalor state drift.
2. Read `terraform output -json auctionoton_access_audiences` and `terraform output -raw auctionoton_access_issuer`. Set `CLOUDFLARE_ACCESS_AUD` to the staging output and `CLOUDFLARE_ACCESS_ISSUER` in `packages/infrastructure/.env.local`.
3. Run `pnpm cf:deploy`. Check anonymous pages, signed-in SSR, both login options, forged/wrong-audience rejection, and sign-out. The local signed-token fixture does not establish end-to-end Google login.
4. Reconcile user ownership and complete the database migration before production traffic cutover. Never reuse the staging audience in production.

Verified locally: website TypeScript, 19 JWT/identity tests, a production build, and nine production-server smoke tests. Smoke tests include a correctly signed session and rejection of cross-origin server-function writes. The local public-key fixture is confined to the test process. The separate identity service passes nine workerd/D1 integration tests, including the real OIDC code exchange, signed claims, interactive continuation, invalid client/PKCE/callbacks, replay, verification, password reset/session revocation, rate limits, and expired-flow recovery. Terraform provisioned 14 Auctionoton resources, and the final scoped plan reports no changes. Both login choices are visible in the deployed chooser; OTP is absent. The live OIDC exchange established that Access uses HTTP Basic client authentication, which is configured and covered in the protocol tests. Forged sessions return 401 and cross-origin logout returns 403. Live logout displayed Cloudflare’s success message, and the subsequent website session request returned 401 with `session: null`. The disposable D1 account, Access identity/seat, and local test credentials were removed after verification. Real Google account consent and email inbox delivery have not been exercised; no test emails were sent.

The once-daily auction cron remains prepared for 04:00 UTC (`0 4 * * *`) and disabled during staging. Production database size, total daily growth, and the old scheduler's host/frequency remain unverified because the old PostgreSQL endpoint refuses connections and no scheduler configuration is tracked.

Rollback before production cutover is the previous website deployment. Preserve password-service secrets and D1 backups together; the auth secret encrypts the persisted signing keys. A fresh checkout must never generate replacement secrets for an existing deployment. After cutover, retain identity mappings and original exports; reverting source alone does not restore sessions or reverse database changes.
