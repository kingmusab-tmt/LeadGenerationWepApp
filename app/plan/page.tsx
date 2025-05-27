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
  Skeleton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useSession } from "next-auth/react";

interface Tier {
  discountPercentage: number;
  discountedPrice: string;
  renewalPrice: any;
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

async function checkIsAuthenticated() {
  try {
    const response = await fetch("/api/auth/check-auth");
    if (!response.ok) {
      throw new Error("Failed to check authentication status");
    }
    return await response.json();
  } catch (error) {
    console.error("Error checking authentication:", error);
    return { isAuthenticated: false, role: null, isSubActive: false };
  }
}

export default function PricingSection() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const role = session?.user?.role || "seller"; // Default to "seller" if role is not available
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubActive, setIsSubActive] = useState<boolean | null>(null);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      const { isAuthenticated, role, isSubActive } =
        await checkIsAuthenticated();
      setIsSubActive(isSubActive ?? false);

      if (isAuthenticated && isSubActive) {
        router.push(`/dashboard/${role}/overview`);
      } else if (isAuthenticated && !isSubActive) {
        router.push("/plan");
      } else {
        router.push("/auth/sign-in");
      }
    };

    checkAuthAndSubscription();
  }, []);

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
            tierId: tier._id,
            planName: tier.name,
            tierType: tier.tierType,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update subscription");
        }

        // Redirect to dashboard or success page
        router.push(`/dashboard/${session?.user.role}/overview`);
      } else {
        // Redirect to checkout for paid tiers
        router.push(`/checkout?plan=${tier._id}`);
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
            {tiers.map((tier, index) => (
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
                <Card
                  sx={{
                    height: "100%",
                    border: tier.highlight
                      ? `2px solid ${theme.palette.primary.main}`
                      : undefined,
                    transform:
                      tier.highlight && !isMobile ? "scale(1.05)" : undefined,
                    transition: "all 0.3s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    "&:hover": {
                      boxShadow: theme.shadows[8],
                      transform:
                        tier.highlight && !isMobile
                          ? "scale(1.07)"
                          : "scale(1.02)",
                    },
                  }}
                >
                  {tier.highlight && (
                    <Box
                      bgcolor="primary.main"
                      color="primary.contrastText"
                      textAlign="center"
                      py={1}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        MOST POPULAR
                      </Typography>
                    </Box>
                  )}

                  {tier.discountPercentage > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        bgcolor: "success.main",
                        color: "success.contrastText",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        zIndex: 1,
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        SAVE {tier.discountPercentage}%
                      </Typography>
                    </Box>
                  )}

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {tier.name}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h3" component="div">
                        $
                        {tier.discountPercentage > 0
                          ? tier.discountedPrice
                          : tier.price}
                        <Typography
                          component="span"
                          variant="h6"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          /month
                        </Typography>
                      </Typography>

                      {tier.discountPercentage > 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          ${tier.price}/month
                        </Typography>
                      )}
                    </Box>

                    {tier.tierType === "paid" && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.primary">
                          <Box component="span" fontWeight="bold">
                            You pay $
                            {(
                              parseFloat(
                                String(tier.discountedPrice || tier.price)
                              ) * 12
                            ).toFixed(2)}
                          </Box>
                          {tier.renewalPrice && (
                            <Box component="span">
                              {" "}
                              - renews at ${tier.renewalPrice}/year
                            </Box>
                          )}
                        </Typography>
                        {tier.discountPercentage > 0 && (
                          <Typography variant="caption" color="success.main">
                            Save {tier.discountPercentage}% on first year
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Typography
                      variant="subtitle1"
                      color="text.secondary"
                      paragraph
                    >
                      {tier.description}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <List dense>
                      {tier.features.map((feature, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
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
