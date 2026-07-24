"use client";

import DashboardErrorBoundary from "@/app/components/generalComponent/DashboardErrorBoundary";

// Root-level error boundary — catches uncaught render errors anywhere that
// doesn't have its own closer error.tsx (checkout, sign-in, onboarding,
// public marketing pages, etc. previously had no boundary at all and fell
// through to Next.js's unstyled default error screen).
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardErrorBoundary
      error={error}
      reset={reset}
      dashboardName="Brixcot"
      description="Something went wrong loading this page. You can try again, or head back to the homepage."
      homeHref="/"
    />
  );
}
