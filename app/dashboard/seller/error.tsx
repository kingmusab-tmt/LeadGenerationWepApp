"use client";

import DashboardErrorBoundary from "@/app/components/generalComponent/DashboardErrorBoundary";
import { useDashboardTerms } from "@/app/hooks";

export default function SellerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const terms = useDashboardTerms();
  return (
    <DashboardErrorBoundary
      error={error}
      reset={reset}
      dashboardName={`${terms.org} Dashboard`}
      homeHref="/dashboard/seller/overview"
    />
  );
}
