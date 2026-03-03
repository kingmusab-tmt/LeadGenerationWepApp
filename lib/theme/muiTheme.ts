import { createTheme, ThemeProvider, PaletteMode } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

/**
 * Material-UI Theme Configuration
 * Centralized theme for the entire application
 * Supports light and dark mode via the `mode` parameter
 */

export function createAppTheme(mode: PaletteMode = "light") {
  return createTheme({
    // Color palette configuration
    palette: {
      mode,
      primary: {
        main: "#1976d2",
        light: "#42a5f5",
        dark: "#1565c0",
        contrastText: "#fff",
      },
      secondary: {
        main: "#dc004e",
        light: "#f73378",
        dark: "#b2003b",
        contrastText: "#fff",
      },
      error: {
        main: "#f44336",
        light: "#e57373",
        dark: "#d32f2f",
      },
      warning: {
        main: "#ff9800",
        light: "#ffb74d",
        dark: "#f57c00",
      },
      success: {
        main: "#4caf50",
        light: "#81c784",
        dark: "#388e3c",
      },
      info: {
        main: "#2196f3",
        light: "#64b5f6",
        dark: "#1976d2",
      },
      background: {
        default: mode === "dark" ? "#121212" : "#fafafa",
        paper: mode === "dark" ? "#1e1e1e" : "#ffffff",
      },
      text: {
        primary:
          mode === "dark" ? "rgba(255, 255, 255, 0.87)" : "rgba(0, 0, 0, 0.87)",
        secondary:
          mode === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
        disabled:
          mode === "dark" ? "rgba(255, 255, 255, 0.38)" : "rgba(0, 0, 0, 0.38)",
      },
    },

    // Typography configuration
    typography: {
      fontFamily: [
        "Arial",
        "Helvetica",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(","),
      h1: {
        fontSize: "2.5rem",
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "-0.015625em",
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 500,
        lineHeight: 1.3,
        letterSpacing: "-0.0083333333em",
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 500,
        lineHeight: 1.6,
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
        letterSpacing: "0.03125em",
      },
      body2: {
        fontSize: "0.875rem",
        fontWeight: 400,
        lineHeight: 1.43,
        letterSpacing: "0.0178571429em",
      },
      button: {
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: 1.75,
        letterSpacing: "0.0892857143em",
        textTransform: "uppercase",
      },
      caption: {
        fontSize: "0.75rem",
        fontWeight: 400,
        lineHeight: 1.66,
        letterSpacing: "0.0333333333em",
      },
      overline: {
        fontSize: "0.75rem",
        fontWeight: 500,
        lineHeight: 2.66,
        letterSpacing: "0.1666666667em",
        textTransform: "uppercase",
      },
    },

    // Component customization
    components: {
      // Button customization
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "4px",
            textTransform: "none",
            fontWeight: 500,
            padding: "8px 16px",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            },
          },
          contained: {
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          },
          outlined: {
            borderWidth: "2px",
            "&:hover": {
              borderWidth: "2px",
            },
          },
        },
        defaultProps: {
          disableRipple: false,
        },
      },

      // TextField customization
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: "4px",
              transition: "all 0.3s ease",
              "&:hover": {
                "& fieldset": {
                  borderColor: "rgba(0, 0, 0, 0.4)",
                },
              },
              "&.Mui-focused": {
                "& fieldset": {
                  boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
                },
              },
            },
          },
        },
      },

      // Card customization
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "box-shadow 0.3s ease, transform 0.3s ease",
            "&:hover": {
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              transform: "translateY(-2px)",
            },
          },
        },
      },

      // Paper customization
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
          },
          elevation0: {
            boxShadow: "none",
            border: mode === "dark" ? "1px solid #333" : "1px solid #e0e0e0",
          },
          elevation1: {
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          },
        },
      },

      // Alert customization
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: "4px",
            fontSize: "0.95rem",
          },
        },
      },

      // Dialog customization
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "8px",
          },
        },
      },

      // List customization
      MuiListItem: {
        styleOverrides: {
          root: {
            transition: "background-color 0.2s ease",
            "&:hover": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.04)",
            },
          },
        },
      },

      // Table customization
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "#2a2a2a" : "#f5f5f5",
            "& th": {
              fontWeight: 600,
              backgroundColor: mode === "dark" ? "#2a2a2a" : "#f5f5f5",
              borderBottom:
                mode === "dark" ? "2px solid #444" : "2px solid #e0e0e0",
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderColor: mode === "dark" ? "#444" : "#e0e0e0",
          },
        },
      },

      // Chip customization
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
          },
        },
      },
    },

    // Shape configuration
    shape: {
      borderRadius: 4,
    },

    // Spacing configuration
    spacing: 8,

    // Breakpoints for responsive design
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
