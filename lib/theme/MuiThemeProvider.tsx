"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import muiTheme from "./muiTheme";

/**
 * Client-side MUI Theme Provider
 * Wraps the application with Material-UI theme and CssBaseline
 */
export default function MuiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
