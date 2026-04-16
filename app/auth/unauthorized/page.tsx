// app/auth/unauthorized/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  CircularProgress,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  // Handle the immediate redirect
  const handleRedirect = () => {
    router.push("/auth/sign-in");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === 0) {
      router.push("/auth/sign-in");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <Box sx={{ mb: 3 }}>
          <WarningIcon color="error" sx={{ fontSize: 60 }} />
        </Box>

        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Access Denied
        </Typography>

        <Typography variant="body1" paragraph>
          You don&apos;t have permission to access this page.
        </Typography>

        <Typography variant="body1" paragraph>
          You will be automatically redirected to the login page in:
        </Typography>

        <Typography
          variant="h5"
          color="primary"
          sx={{
            fontWeight: "bold",
            my: 3,
            display: "inline-block",
            px: 2,
            py: 1,
            bgcolor: "action.hover",
            borderRadius: 1,
          }}
        >
          {countdown} seconds
        </Typography>

        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleRedirect}
            size="large"
            sx={{ px: 4 }}
          >
            Go to Login Now
          </Button>
          <Button variant="outlined" onClick={handleGoHome} size="large">
            Back to Home
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress
            size={24}
            thickness={4}
            variant="determinate"
            value={(10 - countdown) * 10}
          />
        </Box>
      </Paper>
    </Container>
  );
}
