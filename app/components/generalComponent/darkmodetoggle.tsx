import { useColorMode } from "@/lib/theme/MuiThemeProvider";
import { IconButton } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";

export default function DarkModeToggle() {
  const { mode, toggleTheme } = useColorMode();

  return (
    <IconButton onClick={toggleTheme} color="inherit">
      {mode === "dark" ? <LightMode /> : <DarkMode />}
    </IconButton>
  );
}
