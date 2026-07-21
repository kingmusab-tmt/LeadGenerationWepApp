"use client";

import DashboardErrorBoundary from "@/app/components/generalComponent/DashboardErrorBoundary";

export default function BuyerDashboardError({
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
      dashboardName="Buyer Dashboard"
      homeHref="/dashboard/buyer/overview"
    />
  );
}
