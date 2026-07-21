"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { PaletteMode } from "@mui/material";
import { createAppTheme } from "./muiTheme";

const STORAGE_KEY = "brixcot-color-mode";
const MODE_CHANGE_EVENT = "brixcot-color-mode-change";

function readStoredMode(): PaletteMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): PaletteMode {
  return "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(MODE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MODE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

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
 *
 * Mode is read through useSyncExternalStore rather than useState+useEffect:
 * the server snapshot is always "light" (matching the first paint), and the
 * client snapshot reads the persisted preference or OS setting once mounted,
 * without an extra post-mount render.
 */
export default function MuiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useSyncExternalStore(
    subscribe,
    readStoredMode,
    getServerSnapshot,
  );

  const toggleTheme = useCallback(() => {
    const next: PaletteMode = readStoredMode() === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
  }, []);

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
