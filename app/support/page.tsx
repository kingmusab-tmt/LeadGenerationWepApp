"use client";

import Link from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";

export default function SupportPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
          Support
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Need help with your account, billing, or onboarding? Our team is ready
          to assist you.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button component={Link} href="/contact" variant="contained">
            Contact Support
          </Button>
          <Button component={Link} href="/legal" variant="outlined">
            Legal Information
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
