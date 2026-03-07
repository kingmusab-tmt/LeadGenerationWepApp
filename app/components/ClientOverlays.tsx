"use client";
import dynamic from "next/dynamic";

const NotificationManager = dynamic(
  () => import("@/app/components/NotificationManager"),
  { ssr: false },
);
const CookieConsentManager = dynamic(
  () => import("@/app/components/generalComponent/CookieConsentManager"),
  { ssr: false },
);
const ServiceWorkerRegistration = dynamic(
  () => import("@/app/components/ServiceWorkerRegistration"),
  { ssr: false },
);

/**
 * Client-side wrapper for components that need `ssr: false` dynamic imports.
 * Root layout.tsx is a Server Component so it cannot use `ssr: false` directly.
 */
export default function ClientOverlays() {
  return (
    <>
      <ServiceWorkerRegistration />
      <CookieConsentManager />
      <NotificationManager />
    </>
  );
}
