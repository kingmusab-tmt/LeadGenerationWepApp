"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import muiTheme from "./muiTheme";

/**
 * Client-side MUI Theme Provider
 * Wraps the application with Material-UI theme and CssBaseline
 * Uses AppRouterCacheProvider for proper SSR hydration with Next.js App Router
 */
export default function MuiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
