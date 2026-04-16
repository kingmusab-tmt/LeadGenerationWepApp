# Domain Services and API Contracts

## Domain Services (Representative)

Core domain services in `lib/` include:

- lead lifecycle and scoring (`leadScoringEngine.ts`, `leadAssignmentService.ts`)
- subscription/payments (`stripeSubscriptionService.ts`, `subscriptionLimitsService.ts`)
- automation and campaigns (`automationEngine.ts`, `emailMarketingEngine.ts`, `smsMarketingEngine.ts`)
- invoicing (`invoiceEngine.ts`)
- notifications (`notificationService.ts`, `marketplaceNotificationService.ts`)

## API Route Conventions

- Routes are organized by domain under `app/api/`.
- Authenticated routes use `withAuth` wrapper.
- Error handling uses shared error types and standardized response structures.

Expected response contract:

- Success:
  - `success: true`
  - `data: object`
  - `timestamp`
- Error:
  - `success: false`
  - `error: string`
  - `code: ErrorCode`
  - optional `details`
  - `timestamp`

## Key Contract Rules

- No unauthenticated writes for protected resources.
- Signature validation at external webhook boundaries.
- Idempotency for Stripe webhook processing paths.
- Service-level errors should map to deterministic API error codes.

## Current Tested API Surfaces

Phase 7 integration tests currently cover:

- `GET /api/health`
- `/api/searches` favorite lead flows
- `POST /api/integrations/webhooks/incoming`
- auth wrapper behavior for authorized/unauthorized/forbidden flows
