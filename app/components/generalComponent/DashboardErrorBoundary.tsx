"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";

/**
 * Shared body for the seller/buyer/admin dashboard error.tsx boundaries.
 * Next.js requires error.tsx to exist per route segment, but the three
 * were identical apart from the dashboard name and home link — this keeps
 * that one implementation in one place.
 */
export default function DashboardErrorBoundary({
  error,
  reset,
  dashboardName,
  description = "Something went wrong while loading this dashboard view.",
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  dashboardName: string;
  description?: string;
  homeHref: string;
}) {
  useEffect(() => {
    console.error(`[${dashboardName} Error]`, error);
  }, [error, dashboardName]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          {dashboardName} Error
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {description}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button variant="contained" onClick={reset}>
            Try Again
          </Button>
          <Button component={Link} href={homeHref} variant="outlined">
            Back To Overview
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
