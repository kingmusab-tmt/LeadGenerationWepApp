# Environment Setup

## Prerequisites

- Node.js 22+ recommended
- npm 10+
- MongoDB instance
- Optional Redis/Upstash for distributed caching and token coordination

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in project root.
3. Start development server:

```bash
npm run dev
```

Default local URL: `http://localhost:3000`

## Required Environment Variables

Environment is validated in `lib/env.ts`.

Core auth/session:

- `NEXTAUTH_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Database/cache:

- `MONGODB_URI`
- `REDIS_URL` (optional)
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

Twilio:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_FROM_NUMBER` (optional)

Email:

- `EMAIL_FROM`
- `EMAIL_SERVER` (optional)
- `EMAIL_SERVER_HOST` (optional)
- `EMAIL_SERVER_USER` (optional)
- `EMAIL_PASSWORD` (optional)
- `EMAIL_SERVER_PASSWORD` (optional)
- `EMAIL_PORT` (optional, default 465)

Security/crypto:

- `ENCRYPTION_KEY`
- `ENCRYPTION_IV`

Push/web:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `NEXT_PUBLIC_DOMAIN`
- `NEXT_PUBLIC_BASE_URL` (optional)

Stripe:

- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`

AI/integration/public keys (optional depending on feature usage):

- `GEMINI_API_KEY`
- `GOOGLE_AI_STUDIO_KEY`
- `API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_TAWKPROPERTYID`
- `NEXT_PUBLIC_TAWKWIDGETID`
- `NEXT_PUBLIC_VT_TOKEN`
- `NEXT_SECRET_VT_SECRET`
- `NEXT_HTTPS`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`

Observability hooks (production optional):

- `LOGGING_ENDPOINT`
- `ALERT_WEBHOOK_URL`

## Validation Behavior

Application startup parses environment variables with Zod in `lib/env.ts` and fails fast on invalid required values.
