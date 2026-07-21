"use client";

import DashboardErrorBoundary from "@/app/components/generalComponent/DashboardErrorBoundary";

export default function SellerDashboardError({
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
      dashboardName="Seller Dashboard"
      homeHref="/dashboard/seller/overview"
    />
  );
}
