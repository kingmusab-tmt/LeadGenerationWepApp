"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Only fires when the root layout itself throws — which means the theme
// provider, MUI, and everything else in layout.tsx is unavailable, so this
// must render its own <html>/<body> and can't depend on any app styling.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f4",
          color: "#1b2420",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#5b6b62", marginBottom: 24 }}>
            Brixcot hit an unexpected error loading this page. Please try
            again — if it keeps happening, contact support.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2f5d5b",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
