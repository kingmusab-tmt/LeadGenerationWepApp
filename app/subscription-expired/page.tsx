// app/subscription-expired/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Warning,
  ArrowForward,
  Security,
  Speed,
  Support,
  Celebration,
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

interface SubscriptionInfo {
  isTrialExpired: boolean;
  usedTrial: boolean;
  isTrial: boolean;
}

export default function SubscriptionExpiredPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/subscriptions/check");
        if (response.ok) {
          const data = await response.json();
          setSubscriptionInfo({
            isTrialExpired: data.isTrialExpired || false,
            usedTrial: data.usedTrial || false,
            isTrial: data.isTrial || false,
          });
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
      } finally {
        setLoading(false);
      }
    };
    checkSubscription();
  }, []);

  const isTrialExpired =
    subscriptionInfo?.isTrialExpired ||
    (subscriptionInfo?.isTrial && subscriptionInfo?.usedTrial);

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
    router.push("/plan");
  };

  const handleContactSupport = () => {
    // You can implement support contact logic here
    window.open("mailto:support@yourapp.com", "_blank");
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Skeleton variant="circular" width={80} height={80} />
          <Skeleton variant="text" width={300} height={60} />
          <Skeleton variant="text" width={400} height={30} />
        </Stack>
      </Box>
    );
  }

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
            {isTrialExpired ? (
              <Celebration
                sx={{
                  fontSize: 80,
                  color: "primary.main",
                  mb: 3,
                }}
              />
            ) : (
              <Warning
                sx={{
                  fontSize: 80,
                  color: "warning.main",
                  mb: 3,
                }}
              />
            )}
            <Typography
              variant="h3"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "text.primary",
                mb: 2,
              }}
            >
              {isTrialExpired
                ? "Your Free Trial Has Ended"
                : "Subscription Expired"}
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
              {isTrialExpired
                ? "We hope you enjoyed exploring our platform! Choose a subscription plan to continue using all the features you've been testing."
                : "Your subscription has expired. To continue using all features and maintain uninterrupted service, please renew your subscription."}
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
                {isTrialExpired ? "Choose a Plan" : "Renew Subscription"}
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
