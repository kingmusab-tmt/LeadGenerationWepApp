"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";

export default function BuyerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Buyer Dashboard Error]", error);
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Buyer Dashboard Error
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Something went wrong while loading this dashboard view.
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
          <Button
            component={Link}
            href="/dashboard/buyer/overview"
            variant="outlined"
          >
            Back To Overview
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
