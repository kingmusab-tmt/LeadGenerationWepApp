"use client";

import { ReactNode } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import Equalizer from "@mui/icons-material/Equalizer";

/** Shared up/down/flat percentage indicator used under a stat value. */
export function TrendIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <Box display="flex" alignItems="center" gap={0.5} color="success.main">
        <ArrowUpward fontSize="small" />
        <Typography variant="caption">{value}%</Typography>
      </Box>
    );
  }
  if (value < 0) {
    return (
      <Box display="flex" alignItems="center" gap={0.5} color="error.main">
        <ArrowDownward fontSize="small" />
        <Typography variant="caption">{Math.abs(value)}%</Typography>
      </Box>
    );
  }
  return (
    <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
      <Equalizer fontSize="small" />
      <Typography variant="caption">0%</Typography>
    </Box>
  );
}

export interface StatCardProps {
  /** Metric name, e.g. "New Leads" */
  label: string;
  /** The headline number/string, e.g. 128 or "$12,400" */
  value: ReactNode;
  /** Icon shown next to the label ("row") or above the value ("centered") */
  icon?: ReactNode;
  /** Layout: "row" puts label+icon on one line above the value (default);
   *  "centered" stacks icon, value, then label — matching the buyer overview look. */
  variant?: "row" | "centered";
  /** Color token for the value text. Defaults to "primary.main". */
  valueColor?: string;
  /** Convenience footer: renders a TrendIndicator under the value. */
  trend?: number;
  /** Convenience footer: renders a line of secondary text under the value. */
  caption?: ReactNode;
  /** Fully custom footer content. Takes precedence over trend/caption. */
  footer?: ReactNode;
}

/**
 * Shared KPI tile used across the seller, buyer, and admin overview pages.
 * Card elevation/hover/radius come from the theme's MuiCard overrides.
 */
export default function StatCard({
  label,
  value,
  icon,
  variant = "row",
  valueColor = "primary.main",
  trend,
  caption,
  footer,
}: StatCardProps) {
  const footerContent =
    footer ??
    (trend !== undefined ? (
      <TrendIndicator value={trend} />
    ) : caption !== undefined ? (
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    ) : null);

  if (variant === "centered") {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            py: 3,
          }}
        >
          {icon}
          <Typography
            variant="h4"
            sx={{ color: valueColor, fontWeight: "bold", mt: 1 }}
          >
            {value}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {label}
          </Typography>
          {footerContent && <Box sx={{ mt: 0.5 }}>{footerContent}</Box>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color="primary">
            {label}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ color: valueColor, fontWeight: "bold" }}>
          {value}
        </Typography>
        {footerContent}
      </CardContent>
    </Card>
  );
}
