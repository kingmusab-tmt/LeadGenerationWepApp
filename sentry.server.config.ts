import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  // Full request bodies/headers can contain PII (emails, form submissions);
  // keep default scrubbing rather than sending everything.
  sendDefaultPii: false,
});
