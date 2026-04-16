// Navigation context and provider
// Provides navigation functionality to child components

"use client";

import { createContext, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type React from "react";

export interface NavigationContextProps {
  navigateTo: (path: string) => void;
}

export const NavigationContext = createContext<
  NavigationContextProps | undefined
>(undefined);

/**
 * Provider component for navigation functionality
 * Wrap your app with this provider to use useNavigation hook
 *
 * @example
 * export default function RootLayout({ children }) {
 *   return (
 *     <NavigationProvider>
 *       {children}
 *     </NavigationProvider>
 *   );
 * }
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();

  const navigateTo = useCallback(
    (path: string) => {
      router.push(`/dashboard/${path}`, { scroll: false });
    },
    [router],
  );

  const value = useMemo(() => ({ navigateTo }), [navigateTo]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
