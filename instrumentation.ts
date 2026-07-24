import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook — runs once per server/edge runtime at boot.
// Loads the matching Sentry config so server-side and edge-function errors
// are captured the same way client-side errors are (see
// instrumentation-client.ts). Entirely inert if NEXT_PUBLIC_SENTRY_DSN is
// unset — Sentry.init still runs but with enabled:false, so every
// Sentry.* call anywhere in the app becomes a safe no-op.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
