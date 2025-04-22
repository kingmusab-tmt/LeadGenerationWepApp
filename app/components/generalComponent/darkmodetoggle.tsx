import { useTheme } from "@/context/themeprovider";
import { IconButton } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";

export default function DarkModeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <IconButton onClick={toggleTheme} color="inherit">
      <DarkMode />
    </IconButton>
  );
}
