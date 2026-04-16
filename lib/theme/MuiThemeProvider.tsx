"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { PaletteMode } from "@mui/material";
import { createAppTheme } from "./muiTheme";

// --------------- Color-mode context ---------------
interface ColorModeContextValue {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "light",
  toggleTheme: () => {},
});

/** Hook to read / toggle the current palette mode */
export function useColorMode() {
  return useContext(ColorModeContext);
}

/**
 * Client-side MUI Theme Provider
 * Wraps the application with Material-UI theme, CssBaseline, and dark-mode toggle.
 * AppRouterCacheProvider is applied in app/layout.tsx at the server boundary.
 */
export default function MuiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<PaletteMode>("light");

  const toggleTheme = useCallback(
    () => setMode((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const ctx = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);

  return (
    <ColorModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
