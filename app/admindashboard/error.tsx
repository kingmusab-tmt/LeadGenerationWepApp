"use client";

import DashboardErrorBoundary from "@/app/components/generalComponent/DashboardErrorBoundary";

export default function AdminDashboardError({
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
      dashboardName="Admin Dashboard"
      description="Something went wrong while loading this admin view."
      homeHref="/admindashboard/overview"
    />
  );
}
