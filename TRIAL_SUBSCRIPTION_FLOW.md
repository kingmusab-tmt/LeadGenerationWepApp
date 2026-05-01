# Trial Subscription Flow Trace

## Overview

When a user clicks "Start 14 Days Free Trial" or "Try it for free" button, a complex flow is triggered that sets up a 14-day trial subscription. This document traces the complete journey.

---

## 1. INITIAL CLICK - Landing Page Button

**File**: [app/landingpage/page.tsx](app/landingpage/page.tsx#L539-L560)

```tsx
<Button
  variant="contained"
  color="info"
  size="large"
  href="/auth/sign-in?trial=true"
  startIcon={<Rocket />}
  onClick={() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("trialIntent", "true");
    }
  }}
>
  Start 14 Days Free Trial
</Button>
```

**What happens**:

- Button onClick sets `trialIntent = "true"` in browser's `sessionStorage`
- Button navigates to `/auth/sign-in?trial=true` URL
- The `trial=true` query parameter is preserved in the URL

---

## 2. SIGN-IN PAGE - Route Handler

**File**: [app/auth/sign-in/page.tsx](app/auth/sign-in/page.tsx)

This page wraps the content in a Suspense boundary and loads `SignInContent` component.

**File**: [app/auth/sign-in/signin-content.tsx](app/auth/sign-in/signin-content.tsx#L1-L50)

```tsx
const SignInContent: React.FC = () => {
  const { currentUser, loading: userLoading } = useInitializeUser();
  const csrfFetch = useCSRFFetch();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startingTrial, setStartingTrial] = useState(false);
```

**Three scenarios handled**:

### Scenario A: NEW USER (Not Authenticated)

1. User is shown the `SignInPage` component (likely NextAuth sign-in UI)
2. User authenticates via Google or Email
3. NextAuth creates new user record in MongoDB
4. User is redirected back to `/auth/sign-in?trial=true` with new session
5. Flow continues to Scenario B...

### Scenario B: EXISTING USER WITH NO ACTIVE SUBSCRIPTION (Authenticated)

When the `useEffect` hook fires after authentication:

```tsx
useEffect(() => {
  // Waits for session to load
  if (status === "loading") return;
  if (status === "unauthenticated") return;

  // Check for trial intent in URL or sessionStorage
  const trialParam = searchParams.get("trial");
  const trialIntent = trialParam === "true" ||
    sessionStorage.getItem("trialIntent") === "true";

  // Gets role from session or currentUser
  const role = session?.user?.role || currentUser?.role;
  const isSubActive = session?.user?.isSubActive || currentUser?.isSubActive;

  // User is seller/business-admin WITHOUT active subscription AND has trial intent
  if ((role === "seller" || role === "business-admin") && !isSubActive && trialIntent) {
    startTrialForExistingUser().then((success) => {
      if (success) {
        router.replace("/dashboard/seller/overview");
      } else {
        router.replace("/plan");  // Go to pricing if trial fails
      }
    });
  }
```

**The `startTrialForExistingUser()` function**:

```tsx
const startTrialForExistingUser = async () => {
  if (startingTrial) return false;
  setStartingTrial(true);

  try {
    const response = await csrfFetch("/api/subscriptions/trial/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      sessionStorage.removeItem("trialIntent"); // Clean up flag
      await updateSession(); // Refresh JWT token
      return true;
    }
  } catch (error) {
    console.error("[SignIn] Error starting trial:", error);
  }

  sessionStorage.removeItem("trialIntent");
  setStartingTrial(false);
  return false;
};
```

### Scenario C: NEW USER COMPLETING REGISTRATION

**File**: [app/completeregistration/page.tsx](app/completeregistration/page.tsx#L100-L170)

After signing up, new users land on the role selection page. When they select "seller" or "business-admin":

```tsx
if (trialIntent) {
  try {
    setSnackbar({
      open: true,
      message: "Starting your 14-day free trial...",
      severity: "info",
    });

    const trialResponse = await fetch("/api/subscriptions/trial/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (trialResponse.ok) {
      sessionStorage.removeItem("trialIntent");
      await updateSession();

      setSnackbar({
        open: true,
        message:
          "Your 14-day free trial has started! Redirecting to dashboard...",
        severity: "success",
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard/seller/onboarding");
      return;
    } else {
      const trialError = await trialResponse.json().catch(() => null);
      // Handle error - redirect to /plan
      router.push("/plan");
      return;
    }
  } catch (error) {
    console.error("[CompleteRegistration] Error starting trial:", error);
    sessionStorage.removeItem("trialIntent");
    router.push("/plan");
    return;
  }
}
```

---

## 3. BACKEND: TRIAL START API

**File**: [app/api/subscriptions/trial/start/route.ts](app/api/subscriptions/trial/start/route.ts)

### POST Handler - Core Trial Logic

```typescript
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    // Get current user
    const currentUser = await User.findById(session.user.id)
      .select("subscription role");

    // ✅ VALIDATION 1: Check if trial already used
    if (currentUser.subscription?.usedTrial === true) {
      return conflict(
        "You have already used your free trial. Please choose a paid subscription to continue."
      );
    }

    // ✅ VALIDATION 2: Check if already has paid subscription
    if (
      currentUser.subscription?.isSubscriptionActive === true &&
      currentUser.subscription?.subscriptionTierType === "paid"
    ) {
      return conflict(
        "You already have an active paid subscription. No trial needed."
      );
    }
```

### Trial Dates Calculation

```typescript
const TRIAL_DURATION_DAYS = 14;
const TRIAL_PLAN_NAME = "14-Day Free Trial";

const startDate = new Date();
const expiryDate = new Date(startDate);
expiryDate.setDate(expiryDate.getDate() + TRIAL_DURATION_DAYS);
```

### Trial Limits - Professional Tier Features

```typescript
const trialLimits = buildSubscriptionLimitsFromTier(
  TIER_LIMIT_PRESETS.professional,
);

// This gives trial users:
// - 1000+ leads
// - 3+ forms
// - Call recording & transcription
// - AI call analysis
// - Email & SMS campaigns
// - And more professional features
```

### Database Update - User Record

The subscription object is updated in MongoDB:

```typescript
const subscriptionUpdate = {
  "subscription.subscriptionPlan": "14-Day Free Trial",
  "subscription.subscriptionStartDate": startDate,
  "subscription.subscriptionExpiryDate": expiryDate,
  "subscription.isSubscriptionActive": true,
  "subscription.isTrial": true,
  "subscription.usedTrial": true, // Mark trial as used
  "subscription.subscriptionPaymentMethod": "free",
  "subscription.subscriptionTierId": null,
  "subscription.subscriptionTierType": "free",
  "subscription.subscriptionTierUserType": "seller",
  "subscription.subscriptionPrice": 0,
  "subscription.subscriptionLimits": trialLimits,
  "subscription.subscriptionUsage": {
    leads: 0,
    callSeconds: 0,
    forms: 0,
    buyers: 0,
    emailCampaigns: 0,
    smsCampaigns: 0,
    workflowExecutions: 0,
    invoices: 0,
    activeSessions: 0,
    teamMembersCount: 0,
    usagePeriodStart: startDate,
    usagePeriodEnd: expiryDate,
  },
};

const updatedUser = await User.findByIdAndUpdate(
  session.user.id,
  { $set: subscriptionUpdate },
  { new: true },
).select("subscription role");
```

### Session Cache Invalidation

```typescript
// Invalidate cached sessions so new subscription is fetched immediately
await invalidateSessionCache(session.user.email);
await invalidateAllUserSessions(session.user.id);
```

### Success Response

```typescript
return successResponse({
  success: true,
  message: "Your 14-day free trial has started!",
  trial: {
    startDate,
    expiryDate,
    daysRemaining: 14,
    planName: "14-Day Free Trial",
  },
  subscription: updatedUser.subscription,
});
```

---

## 4. SESSION UPDATE & JWT REFRESH

**Flow in client**:

```tsx
// In SignInContent.tsx or CompleteRegistration.tsx
await updateSession(); // NextAuth's updateSession() callback
```

**What happens in auth.ts JWT callback**:

- NextAuth refreshes the JWT token
- Token now includes updated subscription data:
  - `isSubActive: true`
  - `subscriptionTierType: "free"`
  - `isTrial: true`
  - `subscriptionExpiryDate: <14 days from now>`

---

## 5. FINAL REDIRECT

After session is updated, user is redirected based on role:

```
/auth/sign-in?trial=true
  ↓
[POST /api/subscriptions/trial/start] ← Trial subscription created
  ↓
Session updated with new subscription
  ↓
/dashboard/seller/overview  ← User can now access dashboard
```

Or for new users:

```
/completeregistration
  ↓
Select "Seller" role with trialIntent=true
  ↓
[POST /api/subscriptions/trial/start]
  ↓
/dashboard/seller/onboarding
```

---

## 6. SUBSCRIPTION SCHEMA - What Gets Stored

**File**: [models/schemas/schemas.ts](models/schemas/schemas.ts#L220-L300)

```typescript
SubscriptionSchema = {
  // Trial Indicators
  usedTrial: boolean, // Set to true when trial starts
  isTrial: boolean, // Set to true during trial period

  // Subscription Details
  subscriptionPlan: "14-Day Free Trial",
  subscriptionStartDate: Date,
  subscriptionExpiryDate: Date,
  isSubscriptionActive: boolean,
  subscriptionTierType: "free",
  subscriptionPaymentMethod: "free",
  subscriptionPrice: 0,

  // Feature Limits (Professional tier)
  subscriptionLimits: {
    forms: number,
    leads: number,
    callRecording: boolean,
    callTranscription: boolean,
    callAIAnalysis: boolean,
    emailCampaignsEnabled: boolean,
    smsCampaignsEnabled: boolean,
    leadScoringEnabled: boolean,
    sentimentAnalysisEnabled: boolean,
    // ... more features
  },

  // Usage Tracking
  subscriptionUsage: {
    leads: 0,
    callSeconds: 0,
    forms: 0,
    buyers: 0,
    emailCampaigns: 0,
    smsCampaigns: 0,
    usagePeriodStart: Date,
    usagePeriodEnd: Date,
  },
};
```

---

## 7. ALTERNATIVE PATHS - Trial from Pricing Page

**File**: [app/plan/plan.tsx](app/plan/plan.tsx#L200-L250)

Users can also start a trial from the `/plan` pricing page by clicking a free tier card:

```tsx
const handleSelectPlan = async (tier: Tier) => {
  if (tier.tierType === "free") {
    const response = await csrfFetch("/api/subscriptions/trial/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      await updateSession();
      router.push(`/dashboard/${currentUser?.role}/overview`);
    }
  }
};
```

---

## 8. TRIAL EXPIRY FLOW

**When trial expires (automatically handled)**:

- API endpoints check `subscriptionExpiryDate` against current date
- When expired, `isSubscriptionActive` is treated as `false`
- User is redirected to `/plan` to purchase a paid plan
- Features are limited based on free tier if no paid plan selected

---

## 9. ERROR HANDLING

The system handles these cases:

| Scenario                      | Status Code | Error Message                                     |
| ----------------------------- | ----------- | ------------------------------------------------- |
| Already used trial            | 409         | "You have already used your free trial..."        |
| Already has paid subscription | 409         | "You already have an active paid subscription..." |
| Not authenticated             | 401         | "Authentication required"                         |
| Database error                | 500         | "Failed to start trial"                           |

---

## 10. KEY COMPONENTS IN FLOW

| Component                           | Purpose                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| Landing Page Button                 | Sets `trialIntent`, navigates to `/auth/sign-in?trial=true` |
| SignInContent Hook                  | Detects trial intent, calls trial API                       |
| CompleteRegistration                | Handles new user trial enrollment                           |
| POST /api/subscriptions/trial/start | Creates trial subscription in DB                            |
| Session/JWT Update                  | Broadcasts new subscription status to frontend              |
| Dashboard Redirect                  | User can access seller tools for 14 days                    |

---

## Summary

**Timeline**:

1. **T+0s**: User clicks "Start 14 Days Free Trial"
2. **T+1s**: User authenticated (via Google/Email)
3. **T+2s**: Client detects trial intent + authenticated state
4. **T+3s**: POST request to `/api/subscriptions/trial/start`
5. **T+4s**: Backend validates user eligibility & creates trial
6. **T+5s**: MongoDB updated with 14-day trial subscription
7. **T+6s**: Session cache invalidated
8. **T+7s**: Client updates JWT session
9. **T+8s**: User redirected to `/dashboard/seller/overview`
10. **T+9s**: User can access all professional features for 14 days

---

## Files Referenced

- Landing page with CTA: [app/landingpage/page.tsx](app/landingpage/page.tsx#L539)
- Sign-in flow: [app/auth/sign-in/signin-content.tsx](app/auth/sign-in/signin-content.tsx)
- New user flow: [app/completeregistration/page.tsx](app/completeregistration/page.tsx)
- Trial API endpoint: [app/api/subscriptions/trial/start/route.ts](app/api/subscriptions/trial/start/route.ts)
- Pricing page alternative: [app/plan/plan.tsx](app/plan/plan.tsx)
- Subscription schema: [models/schemas/schemas.ts](models/schemas/schemas.ts#L220)
