"use client";

import { Box, type BoxProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Thin client wrapper that resolves theme palette tokens for a hero gradient.
 * Keeps the parent page as a server component.
 */
export default function HeroGradient({ children, sx, ...rest }: BoxProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
        color: "common.white",
        py: { xs: 7, md: 10 },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
