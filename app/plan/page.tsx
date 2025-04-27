"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme, useMediaQuery } from "@mui/material";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Badge,
  Skeleton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";
import { getUserRole } from "@/lib/getUserRoleServerAction";

interface Tier {
  _id: string;
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlight: boolean;
  isFree: boolean;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  ctaText: string;
  order: number;
}

export default async function PricingSection() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const role = await getUserRole();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const response = await fetch("/api/tiers");
        if (!response.ok) {
          throw new Error("Failed to fetch pricing tiers");
        }
        const data = await response.json();
        setTiers(data);
      } catch (err) {
        console.error("Error fetching tiers:", err);
        setError("Failed to load pricing information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, []);

  const handleSelectPlan = async (tier: Tier) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (tier.tierType === "free") {
        // Call API to update user's subscription to free tier
        const response = await fetch("/api/subscriptions/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tierId: tier.id,
            planName: tier.name,
            tierType: tier.tierType,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update subscription");
        }

        // Redirect to dashboard or success page
        router.push(`/dashboard/${role}/overview`);
      } else {
        // Redirect to checkout for paid tiers
        router.push(`/checkout?plan=${tier.id}`);
      }
    } catch (err) {
      console.error("Error processing subscription:", err);
      setError(
        "Failed to process your request. Please try again or contact support."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <Box py={10} bgcolor="background.paper" id="pricing">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Pricing
          </Typography>
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box py={{ xs: 6, md: 10 }} bgcolor="background.paper" id="pricing">
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          Simple, Transparent Pricing
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          paragraph
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          Choose the plan that fits your business needs. Start with our free
          tier and upgrade anytime.
        </Typography>

        {loading ? (
          <Grid container spacing={4} mt={6}>
            {[0, 1, 2].map((index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={400}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : tiers.length > 0 ? (
          <Grid
            container
            spacing={4}
            mt={6}
            alignItems="stretch"
            justifyContent="center"
          >
            {tiers.map((tier) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={tier._id}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Badge
                  badgeContent={
                    tier.highlight ? (
                      <StarIcon
                        sx={{
                          color: theme.palette.warning.main,
                          fontSize: "1.5rem",
                        }}
                      />
                    ) : null
                  }
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "left",
                  }}
                  sx={{
                    width: "100%",
                    "& .MuiBadge-badge": {
                      top: 16,
                      left: 16,
                      transform: "none",
                    },
                  }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      width: "100%",
                      maxWidth: 400,
                      border: tier.highlight
                        ? `2px solid ${theme.palette.primary.main}`
                        : "1px solid rgba(0, 0, 0, 0.12)",
                      boxShadow: tier.highlight
                        ? `0 8px 24px -4px ${theme.palette.primary.light}`
                        : "none",
                      transform:
                        tier.highlight && !isMobile ? "scale(1.02)" : "none",
                      transition: "all 0.3s ease",
                      display: "flex",
                      flexDirection: "column",
                      "&:hover": {
                        transform: !isMobile
                          ? tier.highlight
                            ? "scale(1.05)"
                            : "scale(1.03)"
                          : "none",
                        boxShadow: `0 8px 32px -4px ${theme.palette.primary.light}`,
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        flexGrow: 1,
                        p: { xs: 2, sm: 3 },
                      }}
                    >
                      {tier.highlight && (
                        <Box
                          bgcolor="primary.main"
                          color="primary.contrastText"
                          textAlign="center"
                          py={1}
                          mb={2}
                          borderRadius={1}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            MOST POPULAR
                          </Typography>
                        </Box>
                      )}

                      <Typography
                        variant="h5"
                        component="h2"
                        gutterBottom
                        sx={{ fontWeight: 600 }}
                      >
                        {tier.name}
                      </Typography>
                      <Typography
                        variant="h3"
                        component="div"
                        gutterBottom
                        sx={{ fontWeight: 700 }}
                      >
                        ${tier.price}
                        <Typography
                          component="span"
                          variant="h6"
                          color="text.secondary"
                        >
                          {tier.price > 0 ? "/month" : ""}
                        </Typography>
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        paragraph
                        minHeight={60}
                      >
                        {tier.description}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      <List dense disablePadding>
                        {tier.features.map((feature, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon
                                color="primary"
                                fontSize="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={feature}
                              primaryTypographyProps={{
                                variant: "body2",
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>

                    <CardActions sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
                      <Button
                        fullWidth
                        variant={tier.highlight ? "contained" : "outlined"}
                        color={tier.highlight ? "primary" : "inherit"}
                        size="large"
                        onClick={() => handleSelectPlan(tier)}
                        disabled={isProcessing}
                        sx={{
                          py: 1.5,
                          fontWeight: 600,
                          borderRadius: 1,
                        }}
                      >
                        {isProcessing
                          ? "Processing..."
                          : tier.ctaText ||
                            (tier.isFree ? "Get Started" : "Subscribe")}
                      </Button>
                    </CardActions>
                  </Card>
                </Badge>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography align="center" color="text.secondary" mt={4}>
            No pricing tiers available at the moment. Please check back later.
          </Typography>
        )}
      </Container>
    </Box>
  );
}
