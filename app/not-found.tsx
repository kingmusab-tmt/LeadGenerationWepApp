"use client";

import Link from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";

// Next.js renders this for any URL that doesn't match a route.
// Must be a client component: MUI's Button is itself a client component,
// and passing `component={Link}` (a function reference) as a prop from a
// server component to it isn't serializable across the RSC boundary.
export default function NotFound() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
        <Typography variant="h2" sx={{ mb: 1, fontWeight: 700 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Page not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button component={Link} href="/" variant="contained">
            Back To Homepage
          </Button>
          <Button component={Link} href="/support" variant="outlined">
            Contact Support
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
