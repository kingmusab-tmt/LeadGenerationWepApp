"use client";
/**
 * @deprecated — DO NOT USE.
 * This file is superseded by lib/theme/MuiThemeProvider.tsx
 * which is the single source of truth for MUI theming.
 * Kept only to avoid breaking any stale imports; will be deleted.
 */
import { createContext, useContext, ReactNode } from "react";
import MuiThemeProvider from "@/lib/theme/MuiThemeProvider";

const ThemeContext = createContext({ toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const toggleTheme = () => {
    // Deprecated bridge: no-op to avoid introducing a second theme source.
  };

  return (
    <ThemeContext.Provider value={{ toggleTheme }}>
      <MuiThemeProvider>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
