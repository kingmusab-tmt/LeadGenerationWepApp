import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        // The seller/business-admin dashboard moved from /dashboard/seller/*
        // to /dashboard/* (its files live in the URL-invisible
        // app/dashboard/(seller) route group). Keeps existing bookmarks and
        // any already-issued Stripe return URLs working instead of 404ing.
        source: "/dashboard/seller/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // The public form page is designed to be embedded in a third-party
      // site's <iframe> — that's the whole point of the embed code sellers
      // copy from the forms list. The blanket X-Frame-Options: DENY above
      // applies to every route including this one, so browsers would
      // otherwise refuse to frame it anywhere. CSP's frame-ancestors
      // directive supersedes X-Frame-Options when both are present (per
      // spec, honored by all current browsers) — but the actual
      // frame-ancestors VALUE for this route is set dynamically per-form in
      // proxy.ts (each form can optionally restrict which sites may embed
      // it), not declared statically here, since next.config's headers()
      // can't vary by the form's own saved configuration. This block is
      // intentionally absent; proxy.ts is the single source of truth for
      // this header on /forms/:formId so there's no ambiguity about which
      // layer wins.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      // Static image assets – long cache with immutable hint
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Font files
      {
        source: "/:all*(woff|woff2|ttf|otf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // JS/CSS chunks already fingerprinted by Next.js
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "@mui/icons-material",
      "@mui/material",
      "recharts",
      "react-icons",
      "react-icons/fa",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.twilio.com",
      },
    ],
    qualities: [75, 80],
  },
};

// Only wrap with the Sentry build plugin (source map upload, etc.) once a
// DSN is actually configured — keeps `next build` behaving exactly as it
// did before Sentry was added when SENTRY_AUTH_TOKEN/DSN aren't set yet.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
