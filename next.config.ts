import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
    ];
  },
  experimental: {
    serverActions: {
      // You can specify body size limit if needed
      bodySizeLimit: "2mb",
      // Add allowed origins if required
      // allowedOrigins: ['your-domain.com']
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.twilio.com",
      },
    ],
    qualities: [100, 75, 80],
  },
};

export default nextConfig;
