import { createTheme, ThemeProvider, PaletteMode } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

/**
 * BRIXCOT Design System
 *
 * Primary is anchored to #1976D2 — the exact blue used in the BRIXCOT
 * logo mark — with a full tonal ramp built around it instead of relying
 * on MUI's default lighten()/darken() math. Accent is a warm copper,
 * chosen to be distinct from both primary and the semantic "warning"
 * tone so the three don't collide in charts, chips, or CTAs.
 */
const brand = {
  primary: {
    50: "#EFF6FD",
    100: "#D1E6FA",
    200: "#A4CCF4",
    300: "#6DAEEE",
    400: "#3991E7",
    500: "#1976D2", // exact brand anchor (logo blue)
    600: "#1460AB",
    700: "#104A84",
    800: "#0B345D",
    900: "#071F37",
  },
  accent: {
    50: "#FEF5EC",
    100: "#FBE5D0",
    200: "#F8CBA0",
    300: "#F3AC68",
    400: "#EF8E31",
    500: "#D57110",
    600: "#B4600E",
    700: "#8E4B0B",
    800: "#683708",
    900: "#422305",
  },
};

/** Font stacks — Geist Sans/Mono are already loaded via next/font in app/layout.tsx */
export const fontFamilyBody =
  "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const fontFamilyMono =
  "var(--font-geist-mono), ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace";

export function createAppTheme(mode: PaletteMode = "light") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        ...brand.primary,
        main: brand.primary[500],
        light: brand.primary[300],
        dark: brand.primary[700],
        contrastText: "#fff",
      },
      secondary: {
        ...brand.accent,
        // One shade past the 500 anchor: #D57110 reads well as a swatch but
        // fails WCAG AA (4.5:1) as small text/button-fill against white and
        // the page background. 700 keeps the same copper hue with a safe margin.
        main: brand.accent[700],
        light: brand.accent[500],
        dark: brand.accent[900],
        contrastText: "#fff",
      },
      error: {
        main: "#C13B32",
        light: "#D6756E",
        dark: "#932A23",
      },
      warning: {
        // Darkened from a brighter amber (#C08A00, 3:1) to clear 4.5:1 as text/fill.
        main: "#8A6300",
        light: "#D69B05",
        dark: "#573E00",
      },
      success: {
        // Darkened from #1E8E5A (4.14:1) to clear 4.5:1 as text/fill.
        main: "#1A7A4D",
        light: "#2CBA77",
        dark: "#0F5233",
      },
      info: {
        // Reuses the primary-600 tone: the brighter #2F86D6 failed AA as text
        // (3.8:1); this keeps info conceptually close to primary while passing.
        main: brand.primary[600],
        light: "#76AEE1",
        dark: "#1E67AA",
      },
      background: {
        default: isDark ? "#0E141C" : "#F6F7F9",
        paper: isDark ? "#161D27" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "rgba(240, 242, 245, 0.92)" : "rgba(15, 20, 27, 0.92)",
        secondary: isDark ? "rgba(206, 213, 222, 0.68)" : "rgba(35, 43, 53, 0.64)",
        disabled: isDark ? "rgba(206, 213, 222, 0.38)" : "rgba(35, 43, 53, 0.38)",
      },
      divider: isDark ? "rgba(164, 204, 244, 0.12)" : "rgba(11, 52, 93, 0.10)",
    },

    typography: {
      fontFamily: fontFamilyBody,
      h1: {
        fontSize: "2.5rem",
        fontWeight: 600,
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: "-0.015em",
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
        lineHeight: 1.35,
        letterSpacing: "-0.005em",
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 500,
        lineHeight: 1.75,
        letterSpacing: "0.009375em",
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: 1.57,
        letterSpacing: "0.0071428571em",
      },
      body1: {
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: "0.015em",
      },
      body2: {
        fontSize: "0.875rem",
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      },
      button: {
        fontSize: "0.875rem",
        fontWeight: 600,
        lineHeight: 1.75,
        letterSpacing: "0.02em",
        textTransform: "none",
      },
      caption: {
        fontSize: "0.75rem",
        fontWeight: 400,
        lineHeight: 1.66,
        letterSpacing: "0.0333333333em",
      },
      overline: {
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 2.66,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      },
    },

    components: {
      MuiUseMediaQuery: {
        defaultProps: {
          noSsr: true,
        },
      },

      MuiCssBaseline: {
        styleOverrides: {
          "*:focus-visible": {
            outline: `2px solid ${brand.accent[500]}`,
            outlineOffset: "2px",
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            fontWeight: 600,
            padding: "8px 18px",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              transform: "translateY(-1px)",
            },
          },
          contained: {
            boxShadow: isDark
              ? "0 2px 8px rgba(0,0,0,0.35)"
              : `0 2px 8px ${brand.primary[500]}26`,
            "&:hover": {
              boxShadow: isDark
                ? "0 6px 16px rgba(0,0,0,0.45)"
                : `0 6px 16px ${brand.primary[500]}33`,
            },
          },
          outlined: {
            borderWidth: "1.5px",
            "&:hover": {
              borderWidth: "1.5px",
            },
          },
        },
        defaultProps: {
          disableRipple: false,
        },
      },

      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              transition: "box-shadow 0.15s ease",
              "&:hover": {
                "& fieldset": {
                  borderColor: isDark ? brand.primary[300] : brand.primary[400],
                },
              },
              "&.Mui-focused": {
                "& fieldset": {
                  borderColor: brand.primary[500],
                  boxShadow: `0 0 0 3px ${brand.primary[500]}1F`,
                },
              },
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            boxShadow: isDark
              ? "0 1px 2px rgba(0,0,0,0.3), 0 8px 20px -10px rgba(0,0,0,0.5)"
              : `0 1px 2px ${brand.primary[900]}0D, 0 8px 20px -10px ${brand.primary[900]}26`,
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
            "&:hover": {
              boxShadow: isDark
                ? "0 4px 10px rgba(0,0,0,0.4), 0 14px 28px -12px rgba(0,0,0,0.55)"
                : `0 4px 10px ${brand.primary[900]}12, 0 14px 28px -12px ${brand.primary[900]}30`,
              transform: "translateY(-2px)",
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            backgroundImage: "none",
          },
          elevation0: {
            boxShadow: "none",
            border: `1px solid ${isDark ? "rgba(164, 204, 244, 0.12)" : "rgba(11, 52, 93, 0.10)"}`,
          },
          elevation1: {
            boxShadow: isDark
              ? "0 1px 2px rgba(0,0,0,0.3)"
              : `0 1px 2px ${brand.primary[900]}0D`,
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            fontSize: "0.95rem",
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "14px",
          },
        },
      },

      MuiListItem: {
        styleOverrides: {
          root: {
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: isDark
                ? "rgba(164, 204, 244, 0.08)"
                : `${brand.primary[500]}0A`,
            },
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#1B2330" : brand.primary[50],
            "& th": {
              fontWeight: 700,
              backgroundColor: isDark ? "#1B2330" : brand.primary[50],
              borderBottom: `2px solid ${isDark ? "#2B3644" : brand.primary[100]}`,
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderColor: isDark ? "#2B3644" : brand.primary[100],
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            fontWeight: 600,
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: "6px",
            fontSize: "0.75rem",
          },
        },
      },
    },

    shape: {
      borderRadius: 8,
    },

    spacing: 8,

    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  });
}

// Default light theme for backward compatibility
export const muiTheme = createAppTheme("light");

// Export theme and related utilities
export { ThemeProvider, CssBaseline };
