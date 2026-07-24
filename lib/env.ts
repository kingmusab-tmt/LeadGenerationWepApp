// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Core auth/session
  NEXTAUTH_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),

  // Database/cache
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Twilio
  // Keep build-time env parsing resilient for deployments where Twilio is not used.
  // Runtime SMS helpers validate these before sending.
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_PHONE_NUMBER: z.string().default(""),
  TWILIO_FROM_NUMBER: z.string().default(""),

  // Email
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM: z.string().email(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().default(465),

  // Security/crypto
  // AES-256 requires a 32-byte (64 hex char) key. A misconfigured value
  // here should fail fast at boot rather than crash on first encrypt/decrypt
  // call or, worse, silently succeed with a weakened key if some future
  // change starts padding/truncating instead of erroring.
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes, for AES-256)",
    ),
  // Only used by the oldest legacy decrypt path (static-IV AES-256-CBC);
  // new data is never encrypted with it. Still validated so a malformed
  // value fails at boot instead of surfacing as a decrypt error on
  // whatever legacy record happens to be read first.
  ENCRYPTION_IV: z
    .string()
    .regex(
      /^[0-9a-fA-F]{32}$/,
      "ENCRYPTION_IV must be a 32-character hex string (16 bytes)",
    ),

  // Push/web
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_EMAIL: z.string().email(),
  NEXT_PUBLIC_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // Stripe
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  // Off by default — flip to "true" only after Stripe Tax is enabled and tax
  // registrations are added in the Stripe dashboard (Settings -> Tax).
  // Enabling this before that setup is done will error at checkout.
  STRIPE_AUTOMATIC_TAX_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // AI/integrations
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_AI_STUDIO_KEY: z.string().optional(),
  API_BASE_URL: z.string().url().optional(),

  // Shared secret for the marketing-queue cron endpoint (see
  // app/api/cron/process-marketing-queues/route.ts) — required to actually
  // trigger it, but optional here so its absence doesn't break env
  // validation for deployments that haven't set up scheduling yet.
  CRON_SECRET: z.string().optional(),

  // Frontend public keys
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_TAWKPROPERTYID: z.string().optional(),
  NEXT_PUBLIC_TAWKWIDGETID: z.string().optional(),

  // Error tracking (Sentry). A DSN isn't a secret (it's a public ingest
  // identifier by design), so it's a NEXT_PUBLIC_ var like the others here.
  // Leave unset to keep Sentry fully inert (see instrumentation.ts).
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Legacy VT flags still used in some views
  NEXT_PUBLIC_VT_TOKEN: z.string().optional(),
  NEXT_SECRET_VT_SECRET: z.string().optional(),
  NEXT_HTTPS: z.coerce.boolean().default(false),

  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
