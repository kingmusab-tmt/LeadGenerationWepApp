"use client";
import React from "react";
import { alpha, Box, CircularProgress, Skeleton, Stack, keyframes } from "@mui/material";
import Image from "next/image";
import CompanyLogo from "../../public/BRIXCOT.webp";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
`;

/**
 * Full-viewport branded loader shown while a dashboard route segment loads.
 * Used identically as the root loading.tsx for the seller, buyer, and admin
 * dashboards — kept in one place instead of three copies, and reads the
 * overlay tint from the theme so it doesn't flash white over a dark UI.
 */
export function BrandedDashboardLoader() {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (theme) => alpha(theme.palette.background.default, 0.85),
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 200,
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          thickness={3}
          size={200}
          sx={{
            color: "primary.main",
            position: "absolute",
            animationDuration: "1.5s",
          }}
        />
        <Box
          sx={{
            animation: `${pulse} 2.5s infinite ease-in-out`,
            width: 120,
            height: 120,
            position: "relative",
            filter: "drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))",
          }}
        >
          <Image
            src={CompanyLogo}
            alt="BRIXCOT"
            fill
            priority
            style={{
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

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
