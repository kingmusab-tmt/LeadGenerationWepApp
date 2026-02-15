# Subscription Flow Analysis & Upgrade Recommendations

**Date:** February 12, 2026  
**Project:** LeadGenerationWebApp  
**Status:** Analyssis Complete

---

## Executive Summary

Your subscription system is **functionally operational** but has **significant gaps in automation, reliability, and user experience**. The current implementation uses a one-time payment model rather than true recurring subscriptions, lacks automatic renewal handling, and missing critical features like subscription management, upgrades/downgrades, and customer notifications.

**Risk Level:** ⚠️ **MEDIUM-HIGH**

- No automatic renewal system
- No subscription downgrade handling
- Limited payment method support flexibility
- Session invalidation delays could cause inconsistent billing states

---

## Current Architecture Overview

### Payment Processing Flow

```
User selects plan → Checkout page → Stripe Payment
                                         ↓
                              Payment Gateway Processes
                                         ↓
                         Webhook: checkout.session.completed
                                         ↓
          Update User.subscription with tier limits & expiry date
                                         ↓
          Invalidate session cache → User redirected to dashboard
```

### Key Components

**Models:**

- [models/tier.ts](models/tier.ts) - Pricing plans with features & limits
- [models/userModel.ts](models/userModel.ts) - User with embedded SubscriptionSchema
- [models/transactions.ts](models/transactions.ts) - Payment transaction records

**APIs:**

- [app/api/payments/stripe/stripecheckoutapi](app/api/payments/stripe/stripecheckoutapi/route.ts) - Stripe checkout session
- [app/api/payments/stripe/stripewebhook](app/api/payments/stripe/stripewebhook/route.ts) - Webhook handler
- [app/api/subscriptions/check](app/api/subscriptions/check/route.ts) - Check active subscription
- [app/api/subscriptions/update](app/api/subscriptions/update/route.ts) - Update subscription (manual)
- [app/api/subscriptions/limits](app/api/subscriptions/limits/route.ts) - Get tier limits

**UI:**

- [app/checkout/checkoutContent.tsx](app/checkout/checkoutContent.tsx) - Checkout flow with Stripe
- [app/plan/plan.tsx](app/plan/plan.tsx) - Pricing & plan selection

---

## Current Implementation Details

### Data Structure (SubscriptionSchema) - UPDATED

The subscription schema has been significantly expanded to include granular limits for all application features:

```typescript
{
  usedTrial: boolean;
  subscriptionPlan: string; // Tier name
  subscriptionStartDate: Date; // When subscription began
  subscriptionPrice: number; // Price paid (fixed, non-recurring)
  subscriptionTierId: ObjectId;
  subscriptionTierType: "free" | "paid";
  subscriptionExpiryDate: Date; // When subscription expires
  isSubscriptionActive: boolean; // Manual status flag
  isTrial: boolean;
  subscriptionPaymentMethod: "stripe" | "free";
  subscriptionPaymentId: string; // Stripe Session ID

  subscriptionLimits: {
    // Core Limits
    forms: number; // Max lead capture forms
    leads: number; // Max leads per month (0 = unlimited)
    buyers: number; // Max registered buyers
    industries: number; // Max industries/niches

    // Call Tracking & Telephony
    numbers: number; // Max tracking numbers (manual)
    twilioNumbers: number; // Max Twilio numbers
    callSeconds: number; // Max call seconds per month
    callRecording: boolean; // Enable call recording
    callTranscription: boolean; // Enable AI call transcription
    callAIAnalysis: boolean; // Enable AI call analysis
    multiRingForwarding: boolean; // Enable multi-ring forwarding
    geoRouting: boolean; // Enable geo-based routing
    scheduledCallbacks: boolean; // Enable scheduled callbacks
    concurrentCallLimit: number; // Max concurrent calls

    // Marketing & Campaigns
    emailCampaignsPerMonth: number; // Max email campaigns per month
    smsCampaignsPerMonth: number; // Max SMS campaigns per month
    emailRecipientsPerCampaign: number; // Max recipients per email campaign
    smsRecipientsPerCampaign: number; // Max recipients per SMS campaign

    // Automation & Workflows
    automationWorkflows: number; // Max active automation workflows
    automationActionsPerWorkflow: number; // Max actions per workflow

    // AI & Advanced Features
    chatbotEnabled: boolean; // Enable chatbot qualification
    leadScoringEnabled: boolean; // Enable AI lead scoring
    sentimentAnalysisEnabled: boolean; // Enable sentiment analysis
    aiSummariesEnabled: boolean; // Enable AI summaries

    // Invoicing & Payments
    invoicesPerMonth: number; // Max invoices per month
    customInvoiceBranding: boolean; // Custom invoice branding

    // Integrations
    zapierIntegration: boolean; // Enable Zapier
    webhookIntegration: boolean; // Enable webhooks
    apiAccess: boolean; // Enable API access
    maxWebhooks: number; // Max webhook endpoints

    // Marketplace & Distribution
    marketplaceAccess: boolean; // Lead marketplace access
    exclusiveLeads: boolean; // Exclusive lead access
    leadDistributionRules: boolean; // Advanced distribution rules

    // Data & Reporting
    exports: boolean; // Enable data exports
    imports: boolean; // Enable data imports
    advancedReports: boolean; // Enable advanced analytics
    dataRetentionDays: number; // Data retention period

    // Team & Access
    teamMembers: number; // Max team members/sub-accounts
    maxConcurrentSessions: number; // Max concurrent login sessions

    // Support
    liveSupport: boolean; // Enable live chat support
    prioritySupport: boolean; // Enable priority support

    // Customization
    customBranding: boolean; // White-label/custom branding
    customDomain: boolean; // Custom domain support
  }

  subscriptionUsage: {
    // Core Usage
    leads: number; // Leads used this period
    callSeconds: number; // Call seconds used
    forms: number; // Active forms count
    buyers: number; // Registered buyers count

    // Campaign Usage
    emailCampaigns: number; // Email campaigns sent
    smsCampaigns: number; // SMS campaigns sent

    // Automation Usage
    workflowExecutions: number; // Workflow executions

    // Invoice Usage
    invoices: number; // Invoices created

    // Team Usage
    activeSessions: number; // Current active sessions
    teamMembersCount: number; // Current team members

    // Reset tracking
    usagePeriodStart: Date; // Billing period start
    usagePeriodEnd: Date; // Billing period end
  }
}
```

### Subscription Limits Service

A new centralized service has been created at [lib/subscriptionLimitsService.ts](lib/subscriptionLimitsService.ts) providing:

- `checkNumericLimit()` - Check usage against numeric limits
- `checkFeatureAccess()` - Check boolean feature access
- `incrementUsage()` - Increment usage counters
- `resetMonthlyUsage()` - Reset monthly counters
- `checkConcurrentSessionLimit()` - Check session limits
- `registerSession()` / `removeSession()` - Track concurrent sessions
- `getUsageSummary()` - Get usage percentages for UI
- `TIER_LIMIT_PRESETS` - Pre-defined tier configurations (free, starter, professional, enterprise)

````

### Subscription Lifecycle

1. **Selection** → User picks tier and duration on [app/plan/page.tsx](app/plan/page.tsx)
2. **Checkout** → Stripe session created with fixed amount for N months
3. **Payment** → One-time charge to user's card
4. **Webhook** → `stripecheckoutapi` handler sets `isSubscriptionActive = true` + expiry date
5. **Usage** → User can use service based on subscription limits
6. **Expiry** → When `subscriptionExpiryDate` passes, check endpoint marks `isSubscriptionActive = false`

---

## Critical Issues & Gaps

### 🔴 Priority Issues

#### 1. **No Recurring Billing / Automatic Renewal**

- Current system: **One-time payment** for fixed duration
- Problem: Users must manually repurchase when subscription expires
- Impact: High churn rate, lost revenue, poor user experience
- Evidence:
  - No Stripe Billing integration (subscriptions or recurring charges)
  - `subscriptionPaymentId` stored but no recurring charge reference
  - Manual renewal checks but no auto-renewal

**Recommendation:** Implement Stripe Billing with:

```typescript
// Instead of checkout.sessions with "payment" mode
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: stripePriceId }],
  payment_settings: {
    save_default_payment_method: "on_subscription",
  },
  billing_cycle_anchor: Math.floor(Date.now() / 1000),
});
````

#### 2. **No Plan Upgrade/Downgrade Flow**

- Current: User can only buy new subscriptions, cannot change plans
- Problem: Users forced to wait for expiry to switch plans or buy additional access
- Impact: Lost revenue from upgrades, poor UX

**Recommendation:** Add subscription update endpoint:

```typescript
// POST /api/subscriptions/upgrade
{
  newTierId: string;
  prorationBehavior: "create_prorations" | "always_invoice" | "none";
}
```

#### 3. **Limited Payment Method Flexibility Post-Reload**

- Problem: Once paid, no ability to change payment method without manual admin intervention
- Impact: Users locked into original payment method

**Recommendation:** Add payment method management:

```typescript
// POST /api/subscriptions/payment-method/update
{
  paymentMethodId: string; // Stripe token
}
```

#### 4. **Session Invalidation Race Conditions**

- Current: Webhook handler calls `invalidateSessionCache()` + `invalidateAllUserSessions()`
- Problem: Promises not awaited, could cause:
  - User sees "upgrade required" immediately after payment
  - Session cache lag causing authorization errors
- Evidence: [stripewebhook line 427-431](app/api/payments/stripe/stripewebhook/route.ts#L427-L431)

```typescript
// CURRENT (potentially problematic):
try {
  if (user?.email) {
    await invalidateSessionCache(user.email);
  }
  await invalidateAllUserSessions(userId);
} catch (e) {
  console.error("[StripeWebhook] Failed to invalidate session caches", e);
}
```

#### 5. **No Subscription Cancellation Flow**

- Problem: Users cannot self-service cancel subscriptions
- Impact: Churn uncertainty, no analytics on why users leave

**Recommendation:** Add cancellation endpoint:

```typescript
// POST /api/subscriptions/cancel
{
  reason?: string
  feedbackText?: string
  cancelAt?: "now" | "period_end"
}
```

#### 6. **Missing Subscription Management Dashboard**

- No UI for users to view:
  - Current plan details
  - Renewal date & amount
  - Payment method on file
  - Usage vs. limits
  - Upgrade/downgrade options
  - Cancellation options

#### 7. **No Usage Tracking & Overage Handling**

- Limits are set but never enforced at usage time
- No mechanism for:
  - Usage notifications when approaching limits
  - Overage charges
  - Soft limits vs. hard limits

---

### 🟡 Secondary Issues

#### 8. **Trial Period Logic Issues**

- `usedTrial` flag prevents any free tier, not just first free trial
- No trial auto-upgrade flow (user must manually purchase)
- Problem: Wasted conversion opportunity

#### 9. **Price Sync Issues**

- `discountedPrice` stored in Tier but Stripe uses separate price IDs
- Discounts applied at checkout time, not in Stripe
- Risk: Metadata mismatch during billing audit

#### 10. **Limited Logging & Monitoring**

- No subscription event tracking
- No analytics on conversion funnel
- Missing alerts for failed webhooks

#### 11. **Concurrent Subscription Cleanup**

- No cleanup for duplicate subscription attempts
- No idempotency keys in checkout API

---

## Recommended Upgrade Path

### Phase 1: Foundation (Weeks 1-2) - **Critical**

**Goal:** Enable recurring billing and prevent manual renewal failures

1. **Migrate to Stripe Billing**

   ```typescript
   // Update stripecheckoutapi/route.ts
   // Change from: checkout.sessions (mode: "payment")
   // To: stripe.subscriptions.create()
   ```

   - Keep backward compatibility with existing one-time payments
   - Update webhook to handle `customer.subscription.*` events
   - Store `stripeSubscriptionId` in User model

2. **Add Subscription Auto-Renewal Handler**

   ```typescript
   // New: app/api/maintenance/subscription-renewal/route.ts
   // Runs daily via cron job (Vercel/external scheduler)
   // - Checks for upcoming expirations (7 days)
   // - Sends renewal reminders
   // - Auto-updates statuses for expired subscriptions
   ```

3. **Implement Webhook Idempotency**
   - Add webhook event deduplication
   - Store processed event IDs in DB

---

### Phase 2: User Control (Weeks 2-3) - **High Priority**

1. **Add Subscription Management Endpoints**
   - `GET /api/subscriptions/current` - Current plan details
   - `POST /api/subscriptions/upgrade` - Upgrade plan
   - `POST /api/subscriptions/downgrade` - Downgrade plan
   - `POST /api/subscriptions/cancel` - Cancel with reason
   - `PUT /api/subscriptions/payment-method` - Update payment

2. **Create Subscription Management UI**
   - New dashboard page: `/dashboard/[role]/subscription`
   - Show: current plan, renewal date, usage, upgrade options
   - Payment method selector
   - Cancellation flow with feedback

---

### Phase 3: Enhanced Billing (Weeks 3-4) - **Medium Priority**

1. **Usage Tracking & Limits Enforcement**

   ```typescript
   // During lead purchase/form creation:
   const limits = user.subscription.subscriptionLimits;
   const currentUsage = await calculateUsage(userId);

   if (currentUsage.leads >= limits.leads) {
     throw new Error("Lead limit reached. Upgrade your plan.");
   }
   ```

2. **Overage Charges / Add-ons**
   - Extra leads package
   - Premium features
   - Soft limits with upgrade prompts

---

### Phase 4: Advanced Features (Weeks 4+) - **Low Priority**

1. **Team/Seat-Based Billing**
   - Per-user pricing
   - Volume discounts

2. **Usage-Based Billing**
   - Charge by actual usage
   - Real-time quota tracking

3. **Detailed Billing Portal**
   - Invoice history
   - Tax documents
   - Subscription analytics

---

## Implementation Checklist

### Phase 1: Recurring Billing

- [ ] Update User model: add `stripeSubscriptionId` field
- [ ] Create [app/api/subscriptions/create-recurring/route.ts](app/api/subscriptions/create-recurring/route.ts)
- [ ] Update stripe webhook for `customer.subscription.*` events
- [ ] Update [app/api/subscriptions/check/route.ts](app/api/subscriptions/check/route.ts) to handle Stripe subscriptions
- [ ] Create migration script for existing users → Stripe subscriptions
- [ ] Add [app/api/maintenance/subscription-renewal/route.ts](app/api/maintenance/subscription-renewal/route.ts) with cron trigger
- [ ] Add webhook event deduplication in database
- [ ] Update tests

### Phase 2: User Controls

- [ ] Create [app/api/subscriptions/upgrade/route.ts](app/api/subscriptions/upgrade/route.ts)
- [ ] Create [app/api/subscriptions/downgrade/route.ts](app/api/subscriptions/downgrade/route.ts)
- [ ] Create [app/api/subscriptions/cancel/route.ts](app/api/subscriptions/cancel/route.ts)
- [ ] Create [app/api/subscriptions/payment-method/route.ts](app/api/subscriptions/payment-method/route.ts)
- [ ] Create /dashboard/[role]/subscription page
- [ ] Add subscription status component
- [ ] Add plan comparison modal
- [ ] Update session to include subscription status

### Phase 3: Usage Enforcement

- [ ] Add usage calculation utility
- [ ] Create usage middleware
- [ ] Update lead creation, form creation, export endpoints
- [ ] Add usage alerts
- [ ] Create analytics dashboard

---

## Code Examples

### Example 1: Stripe Billing Migration

```typescript
// app/api/subscriptions/create-recurring/route.ts
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const { tierId, paymentMethodId } = await req.json();
  const session = await getServerSession(authOptions);

  const tier = await Tier.findById(tierId);
  const customer = await getOrCreateStripeCustomer(session.user.id);

  // Create subscription (not a one-time charge)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: tier.stripePriceId }],
    default_payment_method: paymentMethodId,
    expand: ["latest_invoice.payment_intent"],
  });

  // Update user with subscription ID
  await User.findByIdAndUpdate(session.user.id, {
    "subscription.stripeSubscriptionId": subscription.id,
    "subscription.subscriptionStartDate": new Date(),
  });

  return NextResponse.json({ subscription });
}
```

### Example 2: Subscription Upgrade

```typescript
// app/api/subscriptions/upgrade/route.ts
export async function POST(req: NextRequest) {
  const { newTierId, prorationBehavior = "create_prorations" } =
    await req.json();
  const currentUser = await User.findById(session.user.id);

  if (!currentUser.subscription?.stripeSubscriptionId) {
    return badRequest("No active subscription found");
  }

  const newTier = await Tier.findById(newTierId);
  const subscription = await stripe.subscriptions.retrieve(
    currentUser.subscription.stripeSubscriptionId,
  );

  // Update subscription with new item
  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newTier.stripePriceId,
      },
    ],
    proration_behavior: prorationBehavior,
  });

  return successResponse({ subscription: updated });
}
```

### Example 3: Usage Enforcement

```typescript
// lib/checkSubscriptionLimits.ts
export async function checkLeadLimit(userId: string) {
  const user = await User.findById(userId).select("subscription leads");

  const limit = user.subscription.subscriptionLimits.leads;
  const currentCount = user.leads.length;

  if (currentCount >= limit && limit > 0) {
    const error = new Error("Lead limit reached");
    (error as any).statusCode = 403;
    throw error;
  }

  // Warn when approaching limit
  if (currentCount >= limit * 0.8) {
    await notificationService.sendWarning(
      userId,
      `You've used ${currentCount}/${limit} leads`,
    );
  }
}
```

---

## Testing Strategy

### Unit Tests

- [ ] Subscription creation with recurring billing
- [ ] Upgrade/downgrade proration calculations
- [ ] Usage limit enforcement
- [ ] Trial to paid conversion
- [ ] Cancellation workflows

### Integration Tests

- [ ] Full checkout flow → Stripe subscription
- [ ] Webhook handling for all subscription events
- [ ] Session invalidation timing
- [ ] Payment method updates
- [ ] Failed payment retry logic

### E2E Tests

- [ ] User selects plan → checkout → subscription active
- [ ] Subscription upgrade with proration
- [ ] Renewal email sent 7 days before expiry
- [ ] Cancellation removes access

---

## Database Migrations Needed

### User Model Updates

```typescript
subscription: {
  // NEW fields:
  stripeSubscriptionId?: string,          // Recurring subscription ID
  stripeCustomerId?: string,              // Stripe customer object
  cancelledAt?: Date,
  cancellationReason?: string,
  renewalStartDate?: Date,                // For manual renewals

  // EXISTING fields to update:
  // subscriptionPaymentId - now refers to subscription ID
}
```

### New Collections

```typescript
// SubscriptionEvent - Webhook audit log
{
  userId: ObjectId
  eventType: "subscription.created" | "subscription.updated" | "invoice.paid" | etc.
  stripeEventId: string (unique)
  metadata: {}
  processedAt: Date
}

// SubscriptionUsage - Track feature usage
{
  userId: ObjectId
  month: Date
  leads: number
  forms: number
  exports: number
  etc.
}
```

---

## Resources & Documentation

**Stripe Billing Docs:**

- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions)
- [Billing Portal](https://stripe.com/docs/billing/subscriptions/billing-portal)
- [Subscription Events](https://stripe.com/docs/billing/subscriptions/webhooks)

**Monitoring:**

- Set up alerts for failed renewals
- Track webhook processing latency
- Monitor payment method decline rates

---

## Risk Mitigation

### Risk 1: Migration Data Loss

**Solution:** Dual-write pattern (old + new) before full cutover

```typescript
// During transition period:
await User.updateOne({
  $set: {
    "subscription.stripeSubscriptionId": newSubId,
    "subscription.subscriptionPaymentId": newSubId,
  },
});
```

### Risk 2: Failed Webhooks Blocking Subscriptions

**Solution:** Implement webhook retry + fallback process

```typescript
// Schedule daily check for stale subscriptions
if (
  subscription.isSubscriptionActive &&
  Date.now() > subscription.subscriptionExpiryDate &&
  !subscription.renewalAttempted
) {
  // Fallback: attempt renewal manually
}
```

### Risk 3: Double-Charging Users

**Solution:** Idempotency keys in API

```typescript
const idempotencyKey = `${userId}-${tierId}-${Date.now()}`;
// Include in Stripe request to prevent duplicates
```

---

## Timeline & Effort Estimate

| Phase                  | Effort     | Timeline    | Risk   |
| ---------------------- | ---------- | ----------- | ------ |
| Foundation (Recurring) | 40 hrs     | 2 weeks     | Medium |
| User Controls          | 30 hrs     | 2 weeks     | Low    |
| Usage Enforcement      | 20 hrs     | 1 week      | Medium |
| **Total**              | **90 hrs** | **5 weeks** | -      |

---

## Success Metrics

- [ ] Recycled subscriptions increase by 40%+ (from renewals)
- [ ] Customer LTV increases by 60%+ (longer subscription periods)
- [ ] Support tickets for manual renewals drop to near-zero
- [ ] Webhook failure rate < 0.5%
- [ ] Payment success rate > 95%
- [ ] Session consistency (no "permission denied" after checkout) = 99.5%

---

## Conclusion

Your subscription system is **functional but not competitive**. The lack of automatic renewal is the biggest blocker—it prevents predictable recurring revenue. Implementing Stripe Billing and user self-service subscription management will be transformative.

**Recommended Next Step:** Start with Phase 1 (Recurring Billing) this sprint. It's the highest ROI change.
