# Stripe Connect Onboarding Overview

This document summarizes how Stripe Connect onboarding is implemented in this project, what happens after onboarding, and where related logic lives.

## High-level flow

1. Seller opens the settings page and navigates to the Stripe Onboarding tab.
2. The UI checks the seller's existing Stripe account status.
3. If needed, the UI triggers the onboarding API to create a connected account and receive a Stripe onboarding link.
4. The seller completes onboarding on Stripe and is redirected back to the app.
5. The UI handles the return URL, refreshes account status, and updates the tab view.

## UI entry points

- Settings page tabs and routing live in [app/dashboard/seller/settings/setting.tsx](../app/dashboard/seller/settings/setting.tsx).
- The Stripe onboarding tab renders [app/dashboard/seller/settings/stripeonboarding/page.tsx](../app/dashboard/seller/settings/stripeonboarding/page.tsx), which passes the logged-in email to the main component.
- The core onboarding UI, status checks, and return handling are in [app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding.tsx](../app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding.tsx).

Key behaviors in the UI:

- On mount, it calls the account status endpoint and stores `detailsSubmitted`, `chargesEnabled`, `payoutsEnabled`, and requirements.
- When the user clicks the onboarding button, it POSTs to `/api/payments/stripe/onboard` and redirects to the returned `onboardingUrl`.
- On return from Stripe, it reads `stripe_onboarding` and `account_id` query params, refreshes status, and cleans the URL.

## API endpoints involved

### Create or resume onboarding

- Route: [app/api/payments/stripe/onboard/route.ts](../app/api/payments/stripe/onboard/route.ts)
- Auth: requires a NextAuth session.
- Behavior:
  - Looks up the user by email.
  - If a Stripe account already exists, checks if it needs more information and returns a new onboarding link if needed.
  - If no account exists, creates an Express account and then creates an account onboarding link.
  - Updates `User.stripeAccountId` when a new account is created.
  - Returns `accountId` and `onboardingUrl`.
- Return and refresh URLs:
  - `.../dashboard/seller/settings?tab=stripe-onboarding&stripe_onboarding=success&account_id=...`
  - `.../dashboard/seller/settings?tab=stripe-onboarding&stripe_onboarding=restart&account_id=...`

### Account status check

- Route: [app/api/payments/stripe/account-status/route.ts](../app/api/payments/stripe/account-status/route.ts)
- Behavior:
  - Retrieves the user's Stripe account using `stripeAccountId`.
  - Returns `detailsSubmitted`, `chargesEnabled`, `payoutsEnabled`, and requirement lists.
  - If `details_submitted` is true, it sets `User.stripeOnboarded = true`.

## CSRF behavior

State-changing requests to `/api/payments/*` are protected by CSRF in the proxy middleware. The onboarding POST uses `useCSRFFetch` to attach the `X-CSRF-Token` header from the `csrfToken` cookie.

Relevant files:

- [proxy.ts](../proxy.ts)
- [app/hooks/useCSRF.tsx](../app/hooks/useCSRF.tsx)
- [app/api/csrf-token/route.ts](../app/api/csrf-token/route.ts)

## How payouts are currently handled

There is one payout-related pattern in the code:

1. **Checkout with transfer_data (destination charges)**

- Route: [app/api/payments/stripe/stripecheckoutapi/route.ts](../app/api/payments/stripe/stripecheckoutapi/route.ts)
- For credit purchases, a Stripe Checkout Session is created and the PaymentIntent includes:
  - `transfer_data.destination = seller.stripeAccountId`
- This routes funds to the seller's connected account.

Webhook handling for transfers and payments lives in:

- [app/api/payments/stripe/stripewebhook/route.ts](../app/api/payments/stripe/stripewebhook/route.ts)

## Webhook coverage

The webhook handler processes payment, subscription, and transfer events. For account updates:

- It handles `account.updated` for all Connect accounts (including Express) and syncs onboarding flags (`stripeOnboarded`, `chargesEnabled`, `payoutsEnabled`, requirements) to the user record.
- The UI calls `account-status` on page load for immediate status visibility and to handle cases where webhooks haven't processed yet.
- This hybrid approach (webhooks + polling) ensures the database stays up-to-date in the background while providing immediate feedback to users.

## Recent improvements

- Added Stripe Express login link endpoint to let sellers access their Stripe dashboard.
- Enabled webhook processing for Express account updates (not just Custom accounts).
- Removed platform fees from credit purchases (subscription-based monetization).
- Added payout readiness checks before enabling checkout (`chargesEnabled` and `payoutsEnabled` required).
- Implemented idempotency keys for checkout sessions to prevent duplicate charges.
- Removed manual transfer endpoint in favor of destination charges only.

## Architecture summary

**Payout model:** Destination charges (direct transfers to seller connected accounts)
**Monetization:** Subscription-based (no per-transaction platform fees)
**Idempotency:** Client and server-side keys prevent duplicate charges
**Security:** CSRF protection on all state-changing payment endpoints

## Quick map of relevant files

- Onboarding UI: [app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding.tsx](../app/components/sellerComponent/payout/stripeonboarding/StripeOnboarding.tsx)
- Settings tab navigation: [app/dashboard/seller/settings/setting.tsx](../app/dashboard/seller/settings/setting.tsx)
- Onboarding API: [app/api/payments/stripe/onboard/route.ts](../app/api/payments/stripe/onboard/route.ts)
- Status API: [app/api/payments/stripe/account-status/route.ts](../app/api/payments/stripe/account-status/route.ts)
- Login link API: [app/api/payments/stripe/login-link/route.ts](../app/api/payments/stripe/login-link/route.ts)
- Checkout payouts: [app/api/payments/stripe/stripecheckoutapi/route.ts](../app/api/payments/stripe/stripecheckoutapi/route.ts)
- Stripe webhooks: [app/api/payments/stripe/stripewebhook/route.ts](../app/api/payments/stripe/stripewebhook/route.ts)
