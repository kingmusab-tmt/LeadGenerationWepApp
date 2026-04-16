# Auth and Security Flow

## Auth Boundary

- NextAuth configuration lives in `auth.ts`.
- Route protection and role routing are enforced by `proxy.ts` and route-level wrappers.
- API routes requiring authentication use wrapper patterns from `lib/api/async-handler.ts`.

## API Security Controls

- Standard route wrappers:
  - `withErrorHandler`
  - `withAuth`
  - validation wrappers
- Standard error/success response shapes via `lib/api/error-handler.ts`.
- Shared API error logging via `lib/api/error-logger.ts`.

## CSRF and Sensitive Actions

- CSRF token logic:
  - `lib/csrf.ts`
  - `lib/csrfRedis.ts`
- Route/middleware enforcement: `csrfMiddleware.ts` and `proxy.ts`.

## Webhook and External Boundary Security

- Stripe webhook signature verification in stripe webhook route.
- Twilio webhook verification via security middleware in Twilio routes.
- Integration webhook signature verification in incoming webhook route.

## Abuse and Safety Controls

- Rate limiting/security helpers under `lib/security/`.
- Sensitive response hardening and reduced secret/PII exposure in route error paths.

## Session and Role Access Expectations

- Unauthenticated API requests receive 401.
- Authenticated requests missing required role receive 403.
- Authorized requests proceed with normalized response contracts.
