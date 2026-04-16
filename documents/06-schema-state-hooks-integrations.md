# Schema, State, Hooks, and Integrations

## Data Model Layer

Mongoose schema/model definitions are under `models/`.
Notable entities include users, leads, buyers, campaigns, invoices, transactions, calls, and integrations/webhook entities.

## State Management

Redux store setup and slices are distributed across `app/store.ts` and `lib/*Slice.ts`.

Representative slices:

- user state
- UI state
- leads
- buyers
- campaigns
- analytics

## Hooks and Shared Utilities

Reusable hooks and helpers are primarily in:

- `lib/hooks.ts`
- `lib/useNotification.ts`
- route/provider-specific hooks under `app/hooks/`

## Integrations

Primary integration domains:

- Stripe: checkout, onboarding, payouts, refunds, webhook processing
- Twilio: call flow, number management, status callbacks, no-answer/queue handling
- Webhooks: incoming and outgoing integration pipeline under `app/api/integrations/` and `lib/integrations/`

## Integration Reliability Expectations

- Signature verification and replay/rate protections at external boundaries.
- Explicit error handling and normalized API responses.
- Logging via shared logger hooks for diagnostics/alerting.
