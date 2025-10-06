// app/subscription-expired/page.tsx
"use client";

import React from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Warning,
  ArrowForward,
  Security,
  Speed,
  Support,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: "center",
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  boxShadow: theme.shadows[8],
  borderRadius: theme.spacing(2),
}));

const FeatureCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: "center",
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  borderRadius: theme.spacing(2),
  height: "100%",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[4],
  },
}));

export default function SubscriptionExpiredPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const features = [
    {
      icon: <Security sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />,
      title: "Full Platform Access",
      description:
        "Regain access to all features and tools to manage your leads and campaigns effectively.",
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: "secondary.main", mb: 2 }} />,
      title: "Uninterrupted Service",
      description:
        "Continue your operations without any interruptions or limitations on your account.",
    },
    {
      icon: <Support sx={{ fontSize: 40, color: "success.main", mb: 2 }} />,
      title: "Priority Support",
      description:
        "Get dedicated support and faster response times with an active subscription.",
    },
  ];

  const handleRenewSubscription = () => {
    router.push("/pricing");
  };

  const handleContactSupport = () => {
    // You can implement support contact logic here
    window.open("mailto:support@yourapp.com", "_blank");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
        display: "flex",
        alignItems: "center",
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={6}>
          {/* Main Message */}
          <StyledPaper>
            <Warning
              sx={{
                fontSize: 80,
                color: "warning.main",
                mb: 3,
              }}
            />
            <Typography
              variant="h3"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "text.primary",
                mb: 2,
              }}
            >
              Subscription Expired
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "text.secondary",
                maxWidth: 600,
                mx: "auto",
                mb: 4,
              }}
            >
              Your subscription has expired. To continue using all features and
              maintain uninterrupted service, please renew your subscription.
            </Typography>

            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              justifyContent="center"
              sx={{ mb: 4 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleRenewSubscription}
                endIcon={<ArrowForward />}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                Renew Subscription
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleContactSupport}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: "1.1rem",
                }}
              >
                Contact Support
              </Button>
            </Stack>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
              }}
            >
              Need help choosing a plan? Our support team is here to assist you.
            </Typography>
          </StyledPaper>

          {/* Features */}
          <Box>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 4,
              }}
            >
              Why Renew Your Subscription?
            </Typography>
            <Stack direction={isMobile ? "column" : "row"} spacing={3}>
              {features.map((feature, index) => (
                <FeatureCard key={index}>
                  {feature.icon}
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </FeatureCard>
              ))}
            </Stack>
          </Box>

          {/* Additional Info */}
          <Paper
            sx={{
              p: 3,
              textAlign: "center",
              background: theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
              Questions About Your Subscription?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Our team is ready to help you with any questions about billing,
              plan features, or subscription management.
            </Typography>
            <Button
              variant="text"
              onClick={handleContactSupport}
              sx={{ fontWeight: "bold" }}
            >
              Get Help Now →
            </Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
