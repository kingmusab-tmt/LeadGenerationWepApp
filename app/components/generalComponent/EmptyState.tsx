"use client";

import { ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import InboxOutlined from "@mui/icons-material/InboxOutlined";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Shared "nothing here yet" panel — replaces the plain info Alerts and
 * ad hoc empty blocks scattered across the dashboards with one consistent
 * look (icon, title, description, optional action).
 */
export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        py: 6,
        px: 3,
      }}
    >
      <Box
        sx={{
          fontSize: 40,
          lineHeight: 0,
          color: "text.disabled",
          mb: 1.5,
        }}
      >
        {icon ?? <InboxOutlined fontSize="inherit" />}
      </Box>
      <Typography
        variant="subtitle1"
        sx={{ color: "text.primary", fontWeight: 600 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 360, mt: 0.5 }}
        >
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 2.5 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
