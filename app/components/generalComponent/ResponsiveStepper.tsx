"use client";

import {
  Stepper,
  type StepperProps,
  useMediaQuery,
  useTheme,
} from "@mui/material";

/**
 * Thin client wrapper around MUI Stepper that switches orientation
 * based on the "sm" breakpoint. Keeps the parent page a server component.
 */
export default function ResponsiveStepper(
  props: Omit<StepperProps, "orientation" | "alternativeLabel">,
) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Stepper
      orientation={isMobile ? "vertical" : "horizontal"}
      alternativeLabel={!isMobile}
      {...props}
    />
  );
}
