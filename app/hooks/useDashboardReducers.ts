"use client";

import { useEffect } from "react";
import { injectDashboardReducers } from "@/app/store";

/**
 * Injects the dashboard-only Redux slices (leads, buyers, campaigns, etc.)
 * on first render. Call this once in every dashboard layout.
 */
export function useDashboardReducers() {
  useEffect(() => {
    injectDashboardReducers();
  }, []);
}
