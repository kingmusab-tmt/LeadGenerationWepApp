"use client";
import React from "react";
import { Box, CircularProgress, Skeleton, Stack } from "@mui/material";

/**
 * Compact centered spinner for public-facing page transitions.
 */
export function PageSpinner() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <CircularProgress size={40} />
    </Box>
  );
}

/**
 * Dashboard-style skeleton with stat cards and a content area.
 * Used as loading.tsx inside dashboard sub-routes.
 */
export function DashboardSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
      {/* Title bar */}
      <Skeleton variant="text" width={220} height={36} sx={{ mb: 2 }} />

      {/* Stat cards row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={100}
            sx={{ flex: 1, borderRadius: 2 }}
          />
        ))}
      </Stack>

      {/* Main content area */}
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
    </Box>
  );
}
