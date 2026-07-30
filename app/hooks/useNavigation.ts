// Navigation hook for dashboard-specific routing
// Provides simple interface for navigating between dashboard sections

"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { NavigationContext } from "./useNavigationProvider";
import type { NavigationContextProps } from "./useNavigationProvider";

/**
 * Hook for navigating to dashboard sections
 * Must be used within NavigationProvider
 * Automatically prefixes routes with /dashboard/
 *
 * @returns Object with navigateTo function
 * @throws Error if used outside NavigationProvider
 *
 * @example
 * const { navigateTo } = useNavigation();
 * navigateTo("overview"); // Navigates to /dashboard/overview
 */
export const useNavigation = (): NavigationContextProps => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

/**
 * Hook for direct Next.js router access
 * Use useNavigation() for dashboard navigation when possible
 * Use this hook for full control over routing
 *
 * @returns Next.js useRouter hook
 *
 * @example
 * const router = useNavigationRouter();
 * router.push("/auth/sign-in");
 * router.back();
 */
export const useNavigationRouter = () => {
  return useRouter();
};
