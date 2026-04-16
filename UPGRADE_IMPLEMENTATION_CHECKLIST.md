# BRIXCOT Upgrade Implementation Checklist

Use this as the execution checklist for the full modernization plan.

## How To Use

1. Complete phases in order.
2. Do not start the next phase until the current phase sign-off is green.
3. For every item, capture:

- Owner
- Date
- Evidence (PR, test run, screenshot, log)

## Global Gates (Run Every Phase)

- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [x] Build passes (`npm run build`)
- [ ] No new console/server errors introduced
- [ ] Security-sensitive changes include validation and auth checks

## Phase 1 - Foundation And Control Plane

### Execution Order

- [x] `package.json` dependency and scripts baseline
- [x] `tsconfig.json` strictness and alias baseline
- [x] `next.config.ts` headers, cache, runtime limits
- [x] `lib/env.ts` environment contract validation
- [x] `lib/db.ts` database connection baseline
- [x] `lib/connectdb.ts` mongoose connection behavior
- [x] `lib/redis.ts` redis fallback and TTL behavior
- [x] `lib/memoryCache.ts` local cache limits and cleanup
- [x] `lib/cachedSession.ts` session cache correctness
- [x] `lib/csrfRedis.ts` distributed CSRF token behavior
- [x] `lib/csrf.ts` token generation and verification
- [x] `csrfMiddleware.ts` route-level CSRF policy
- [x] `proxy.ts` role and route protection behavior
- [x] `auth.ts` provider, JWT, session callback consistency
- [x] `app/layout.tsx` provider composition and shell
- [x] `app/reduxprovider.tsx` store provider wiring
- [x] `authprovider.tsx` session provider wiring
- [x] `context/themeprovider.tsx` deprecation and migration check
- [x] `context/handlenavigation.tsx` navigation provider behavior
- [x] `app/components/ClientOverlays.tsx` client-only overlay behavior
- [x] `app/globals.css` baseline global UI behavior
- [x] `README.md` quickstart and foundation docs alignment

### Sign-Off

- [ ] Auth, CSRF, and role routing all validated in browser
- [ ] Session/token behavior consistent across refresh/navigation
- [ ] No duplicate provider or middleware behavior

## Phase 2 - Domain Models And Business Logic

### Execution Order

- [x] `models/index.ts` export contract and circular dependency check
- [x] `models/userModel.ts`
- [x] `models/leadbuyers.ts`
- [x] `models/leads.ts`
- [x] `models/form.ts`
- [x] `models/campaign.ts`
- [x] `models/invoice.ts`
- [x] `models/automationWorkflow.ts`
- [x] `lib/leadScoringEngine.ts`
- [x] `lib/leadAssignmentService.ts`
- [x] `lib/automationEngine.ts`
- [x] `lib/subscriptionLimitsService.ts`
- [x] `lib/priceSyncService.ts`
- [x] `lib/stripeSubscriptionService.ts`
- [x] `lib/invoiceEngine.ts`
- [x] `lib/emailMarketingEngine.ts`
- [x] `lib/smsMarketingEngine.ts`
- [x] `lib/notificationService.ts`
- [x] `lib/marketplaceNotificationService.ts`
- [x] `lib/sentimentEngine.ts`
- [x] `lib/buyerOnboarding.ts`
- [x] `lib/sellerOnboarding.ts`
- [x] Reconcile helpers: `lib/formatUtils.ts`, `lib/encryption.ts`, `lib/validation/`, `lib/security/`

### Sign-Off

- [ ] Model fields, enums, and indexes match runtime usage
- [ ] Service ownership is clear (validation, persistence, side effects)
- [ ] No duplicated business logic across services

## Phase 3 - Redux And Hooks

### Execution Order

- [x] `app/store.ts`
- [x] `lib/userSlice.ts`
- [x] `lib/uiSlice.ts`
- [x] `lib/leadsSlice.ts`
- [x] `lib/buyersSlice.ts`
- [x] `lib/campaignsSlice.ts`
- [x] `lib/analyticsSlice.ts`
- [x] `lib/formBuilderSlice.ts`
- [x] `app/reduxprovider.tsx`
- [x] `app/hooks/useRedux.ts`
- [x] `app/hooks/useNotification.ts`
- [x] `app/hooks/useUser.ts`
- [x] `app/hooks/useDashboardReducers.ts`
- [x] `app/hooks/useSessionRefresh.ts`
- [x] `app/hooks/useStripe.ts`
- [x] `app/hooks/useSubscriptionCancel.ts`
- [x] `app/hooks/useSubscriptionLimits.ts`
- [x] `app/hooks/useUsageTracking.ts`
- [x] `app/hooks/useNavigationProvider.tsx`
- [x] `app/hooks/useNavigation.ts`
- [x] `app/hooks/useCSRF.tsx`
- [x] `app/hooks/useConfirm.tsx`
- [x] `app/hooks/index.ts`
- [x] Migrate legacy bridges: `lib/hooks.ts`, `lib/useNotification.ts`

### Sign-Off

- [x] Dashboard reducers inject once and only where needed
- [x] RootState and AppDispatch typing is consistent
- [x] No remaining imports from deprecated hook bridges

## Phase 4 - API And Server Actions

### Execution Order

- [x] Define one API standard: validation, auth, response, error, logging
- [x] Audit `app/api/auth/`, `app/api/csrf-token/`, `app/api/security/`
- [x] Audit server actions: `app/actions.ts` and all `lib/*ServerAction.ts`
- [x] Audit billing APIs: `app/api/subscriptions/`, `app/api/payments/`, `app/api/tiers/`, `app/api/invoices/`
- [x] Audit webhook-heavy APIs: `app/api/calls/`, `app/api/marketing/`, `app/api/integrations/`, `app/api/verifications/`
- [x] Audit core domain APIs: `app/api/leads/`, `app/api/buyers/`, `app/api/sellers/`, `app/api/automation/`, `app/api/form/`
- [x] Audit admin/settings APIs: `app/api/admin/`, `app/api/users/`, `app/api/settings/`, `app/api/support/`, `app/api/help/`
- [x] Audit low-risk APIs: `app/api/health/`, `app/api/cache/`, `app/api/searches/`, `app/api/overview/`

### Sign-Off

- [x] No unauthenticated write endpoints
- [x] Webhooks are idempotent and signature-verified
- [x] All routes return normalized success and error shapes

## Phase 5 - Route And Flow Audit

### Execution Order

- [x] Public pages: `app/page.tsx`, `app/landingpage/`, `app/how-it-works/`, `app/features/`, `app/trust/`, `app/blog/`, `app/pricing/`, `app/plan/`
- [x] Legal/privacy/support pages
- [x] Auth pages under `app/auth/`
- [x] Registration/onboarding pages
- [x] Dashboard route shells and role redirects
- [x] Buyer dashboard flows
- [x] Seller dashboard flows
- [x] Admin dashboard flows
- [x] Functional modules: forms, checkout, chatbot, shared components
- [x] Error/recovery states: loading, boundary, expired subscription

### Sign-Off

- [x] No dead-end navigation
- [x] Loading/empty/error/permission states are consistent
- [x] Mobile and desktop flow checks pass

## Phase 6 - Integrations And Security-Sensitive Paths

### Execution Order

- [x] Crypto/token foundation: `lib/encryption.ts`, `lib/csrf.ts`, `lib/csrfRedis.ts`
- [x] Stripe payment + webhook paths
- [x] Twilio call/webhook paths
- [x] Email/SMS/notification integrations
- [x] Integration management and webhook config paths
- [x] Verification and security-adjacent endpoints
- [x] Recheck `next.config.ts` security/cache settings

### Sign-Off

- [x] Signature verification enforced at all external boundaries
- [x] Retries bounded and safe
- [x] PII and secrets never exposed in logs or responses

## Phase 7 - Quality Gates And Observability

### Execution Order

- [x] Finalize shared error/logging infrastructure
- [x] Add test runner/config and mock infrastructure
- [x] Add unit tests for critical services first
- [x] Add API integration tests
- [x] Add webhook/integration tests
- [x] Add auth/security tests
- [x] Add E2E smoke tests for key journeys
- [x] Add CI gates (lint/typecheck/build/tests/coverage)
- [x] Add production observability wiring and alerting

### Sign-Off

- [ ] Test suites run reliably locally and in CI
- [ ] Coverage targets met for critical paths
- [ ] Production diagnostics and alerting verified

## Phase 8 - Documentation And Release Readiness

### Execution Order

- [x] Create architecture baseline documentation
- [x] Create environment setup documentation
- [x] Create build/test/CI documentation
- [x] Document auth/security flow
- [x] Document domain services and API contracts
- [x] Document schema/state/hooks/integrations
- [x] Update `README.md` as the index document
- [x] Add release checklist and changelog/release-notes entry
- [x] Record final architectural decisions

### Sign-Off

- [ ] New engineers can set up and run from docs only
- [ ] Release checklist fully green
- [x] Handoff package includes evidence links for all phases

Evidence reference: `documents/09-handoff-evidence.md`
