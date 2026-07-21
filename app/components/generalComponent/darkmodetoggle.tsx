import { useColorMode } from "@/lib/theme/MuiThemeProvider";
import { IconButton, Tooltip, SxProps, Theme } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";

export default function DarkModeToggle({ sx }: { sx?: SxProps<Theme> }) {
  const { mode, toggleTheme } = useColorMode();

  return (
    <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        sx={sx}
      >
        {mode === "dark" ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
}
