# Architecture Baseline

## System Overview

BRIXCOT is a Next.js 16 App Router application with role-based experiences for sellers, buyers, and admins.

Primary layers:

- UI and route shells under `app/`
- API routes under `app/api/`
- Domain services and infrastructure helpers under `lib/`
- Persistence models under `models/`
- Shared state slices and providers across `app/` and `lib/`

## High-Level Request Flow

1. Request enters Next.js route handler/page.
2. `proxy.ts` and route-level wrappers enforce auth/authorization/CSRF/rate-limit policy.
3. Domain logic executes in `lib/` services.
4. Data access runs through Mongoose models in `models/`.
5. Route returns standardized JSON response objects for API routes.

## Core Runtime Building Blocks

- Authentication/session: NextAuth (`auth.ts`)
- Data store: MongoDB via Mongoose (`lib/connectdb.ts`, models)
- Caching and token/limit support: Redis + in-memory fallback (`lib/redis.ts`, `lib/memoryCache.ts`)
- Payments: Stripe APIs/webhooks
- Calling/messaging: Twilio APIs/webhooks
- Validation: Zod schemas and wrapper-based request validation

## Reliability and Safety Foundations

- Shared API wrappers centralize auth/error handling (`lib/api/async-handler.ts`)
- Shared logger includes production forwarding hooks (`lib/api/error-logger.ts`)
- Signature checks and idempotency added for external boundaries (Stripe/webhooks/Twilio)
- `lib/env.ts` validates runtime environment contract

## Testing Architecture

- Unit and integration tests: Vitest (`tests/`)
- Browser smoke tests: Playwright (`tests/e2e/`)
- CI quality gates: GitHub Actions workflow (`.github/workflows/quality-gates.yml`)

## Deployment Notes

- Build command: `npm run build`
- Start command: `npm run start`
- CI enforces lint/typecheck/test/coverage/build and E2E smoke tests.
