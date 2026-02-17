"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Chip,
  Alert,
  Snackbar,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import BusinessIcon from "@mui/icons-material/Business";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useInitializeUser } from "@/lib/hooks";
import { useCSRFFetch } from "@/app/hooks";

interface Tier {
  discountPercentage: number;
  discountedPrice: string;
  renewalPrice: any;
  annualPrice?: string;
  _id: string;
  id: string;
  name: string;
  price: number | string;
  description: string;
  features: string[];
  highlight: boolean;
  isFree: boolean;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  ctaText: string;
  order: number;
}

interface SubscriptionCheckResponse {
  isActive: boolean;
  expiryDate: string | null;
  usedTrial: boolean;
  daysRemaining?: number;
}

export default function PricingSection() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useInitializeUser();
  const csrfFetch = useCSRFFetch();
  const { data: session, update: updateSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionCheckResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);

  // User type selection - default to their current role or seller
  const [userType, setUserType] = useState<"seller" | "business">(
    (currentUser?.tierUserType || "seller") as "seller" | "business",
  );

  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // First check: if session already shows active subscription, redirect immediately
  useEffect(() => {
    if (session?.user?.isSubActive === true && !isRedirecting) {
      console.log(
        "[Plan Page] Session shows active subscription, redirecting immediately",
      );
      setIsRedirecting(true);
      const userRole = session?.user?.role;
      if (userRole) {
        router.replace(`/dashboard/${userRole}/overview`);
      }
    }
  }, [session, router, isRedirecting]);

  useEffect(() => {
    const checkSubscriptionAndFetchTiers = async () => {
      try {
        // Skip if already redirecting due to active subscription
        if (session?.user?.isSubActive === true) {
          return;
        }

        // Only check subscription status if user is authenticated
        if (currentUser) {
          // Check if user has an active subscription
          const subscriptionCheck = await fetch("/api/subscriptions/check", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (subscriptionCheck.ok) {
            const subscriptionData: SubscriptionCheckResponse =
              await subscriptionCheck.json();
            setSubscriptionInfo(subscriptionData);

            // Calculate days remaining if expiry date exists
            let daysRemaining = 0;
            if (subscriptionData.expiryDate) {
              const expiry = new Date(subscriptionData.expiryDate);
              const today = new Date();
              const timeDiff = expiry.getTime() - today.getTime();
              daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            }

            console.log("[Plan Page] Subscription check:", {
              isActive: subscriptionData.isActive,
              expiryDate: subscriptionData.expiryDate,
              daysRemaining,
            });

            // If user has active subscription, redirect to dashboard
            if (subscriptionData.isActive) {
              console.log(
                "[Plan Page] Active subscription detected, redirecting...",
              );
              setShouldRedirect(true);
              return; // Don't fetch tiers if user is subscribed
            }

            // If subscription is inactive, allow access to pricing
          }
        }

        // Fetch pricing tiers for non-subscribed users, users with expiring subscriptions, or unauthenticated users
        const tiersResponse = await fetch("/api/tiers");
        if (!tiersResponse.ok) {
          throw new Error("Failed to fetch pricing tiers");
        }
        const tiersData = await tiersResponse.json();
        setTiers(tiersData);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load pricing information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    checkSubscriptionAndFetchTiers();
  }, [currentUser]);

  // Handle redirect after component render
  useEffect(() => {
    if (shouldRedirect && !isRedirecting) {
      // Use session role as primary source, fallback to currentUser
      const userRole = session?.user?.role || currentUser?.role;
      if (userRole) {
        console.log(
          "[Plan Page] Redirecting to dashboard with role:",
          userRole,
        );
        setIsRedirecting(true);
        router.replace(`/dashboard/${userRole}/overview`);
      } else {
        console.log("[Plan Page] Cannot redirect - no role found");
      }
    }
  }, [shouldRedirect, session, currentUser, router, isRedirecting]);

  const handleSelectPlan = async (tier: Tier) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setApiError(null); // Clear previous errors

    try {
      if (tier.tierType === "free") {
        // Call API to update user's subscription to free tier
        const response = await csrfFetch("/api/subscriptions/update", {
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

        const responseData = await response.json();

        if (!response.ok) {
          // Handle specific error for used trial
          if (response.status === 400 && responseData.error) {
            setApiError(responseData.error);
            setShowErrorSnackbar(true);
            return; // Don't proceed with redirect
          }
          throw new Error(
            responseData.error || "Failed to update subscription",
          );
        }

        console.log(
          "[Plan Page] Subscription updated successfully, refreshing session...",
        );

        // Force session refresh to update JWT token with new subscription status
        // This triggers the JWT callback which fetches fresh data from the database
        await updateSession();

        // Small delay to ensure session propagates before redirect
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Redirect to dashboard after session is refreshed
        console.log("[Plan Page] Session refreshed, redirecting to dashboard");
        router.push(`/dashboard/${currentUser?.role}/overview`);
      } else {
        // Redirect to checkout for paid tiers
        router.push(`/checkout?plan=${tier._id}`);
      }
    } catch (err: any) {
      console.error("Error processing subscription:", err);
      // Only set generic error if it's not the specific trial error
      if (!err.message?.includes("already used your free trial")) {
        setError(
          "Failed to process your request. Please try again or contact support.",
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseErrorSnackbar = () => {
    setShowErrorSnackbar(false);
    setApiError(null);
  };

  const handleUserTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: "seller" | "business" | null,
  ) => {
    if (newType !== null) {
      setUserType(newType);
    }
  };

  // Filter out free tier if user has already used trial
  let filteredTiers = subscriptionInfo?.usedTrial
    ? tiers.filter((tier) => tier.tierType !== "free")
    : tiers;

  // Filter by user type (role)
  filteredTiers = filteredTiers.filter(
    (tier) => tier.tierUserType === userType,
  );

  // Determine if user is renewing (has active subscription that's expiring soon)
  const isRenewing =
    subscriptionInfo?.isActive &&
    subscriptionInfo.expiryDate &&
    (() => {
      if (!subscriptionInfo.expiryDate) return false;
      const expiry = new Date(subscriptionInfo.expiryDate);
      const today = new Date();
      const timeDiff = expiry.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysRemaining <= 10;
    })();

  // Calculate days remaining for display
  const daysRemaining = subscriptionInfo?.expiryDate
    ? Math.ceil(
        (new Date(subscriptionInfo.expiryDate).getTime() -
          new Date().getTime()) /
          (1000 * 3600 * 24),
      )
    : 0;

  // Show loading state while checking authentication, subscription, or redirecting
  if (loading || isRedirecting) {
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
          <Grid container spacing={4} mt={6}>
            {[0, 1, 2].map((index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={400}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  // Show error state if there's an error
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

  // Don't render anything if redirecting (brief moment before redirect happens)
  if (shouldRedirect) {
    return (
      <Box py={10} bgcolor="background.paper" id="pricing">
        <Container maxWidth="lg">
          <Typography align="center">
            Redirecting to your dashboard...
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box py={{ xs: 6, md: 10 }} bgcolor="background.paper" id="pricing">
      <Container maxWidth="lg">
        {/* Error Snackbar for API errors */}
        <Snackbar
          open={showErrorSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseErrorSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity="error"
            onClose={handleCloseErrorSnackbar}
            sx={{ width: "100%" }}
          >
            {apiError}
          </Alert>
        </Snackbar>

        <Typography
          variant="h3"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          {isRenewing
            ? "Renew Your Subscription"
            : "Simple, Transparent Pricing"}
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          paragraph
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          {isRenewing
            ? `Your subscription expires in ${daysRemaining} day${
                daysRemaining !== 1 ? "s" : ""
              }. Choose a plan to continue uninterrupted service.`
            : "Choose the plan that fits your business needs. Start with our free tier and upgrade anytime."}
        </Typography>

        {/* User Type Toggle */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              borderRadius: 3,
              bgcolor: "action.hover",
            }}
          >
            <ToggleButtonGroup
              value={userType}
              exclusive
              onChange={handleUserTypeChange}
              aria-label="user type"
              sx={{
                "& .MuiToggleButton-root": {
                  px: 4,
                  py: 1.5,
                  border: "none",
                  borderRadius: "12px !important",
                  textTransform: "none",
                  fontWeight: 600,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  },
                },
              }}
            >
              <ToggleButton value="seller">
                <StorefrontIcon sx={{ mr: 1 }} />
                Lead Seller
              </ToggleButton>
              <ToggleButton value="business">
                <BusinessIcon sx={{ mr: 1 }} />
                Business
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>

        {/* Alert for expiring subscription */}
        {isRenewing && (
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            sx={{ mb: 4, maxWidth: 600, mx: "auto" }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Subscription Expiring Soon
            </Typography>
            <Typography variant="body2">
              Your current subscription will expire in {daysRemaining} day
              {daysRemaining !== 1 ? "s" : ""}. Renew now to maintain access to
              all features and avoid service interruption.
            </Typography>
          </Alert>
        )}

        {/* Alert for used trial */}
        {subscriptionInfo?.usedTrial && !isRenewing && (
          <Alert severity="info" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
            <Typography variant="body2">
              You've already used your free trial. Upgrade to a paid plan to
              continue using our services.
            </Typography>
          </Alert>
        )}

        {filteredTiers.length > 0 ? (
          <Grid
            container
            spacing={4}
            mt={2}
            alignItems="stretch"
            justifyContent="center"
          >
            {filteredTiers.map((tier) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4 }}
                // Changed from

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
                    opacity:
                      subscriptionInfo?.usedTrial && tier.tierType === "free"
                        ? 0.6
                        : 1,
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

                  {/* Used Trial Badge */}
                  {subscriptionInfo?.usedTrial && tier.tierType === "free" && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        bgcolor: "grey.500",
                        color: "white",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        zIndex: 1,
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        TRIAL USED
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
                                String(tier.discountedPrice || tier.price),
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
                      disabled={
                        isProcessing ||
                        (subscriptionInfo?.usedTrial &&
                          tier.tierType === "free")
                      }
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        borderRadius: 1,
                      }}
                    >
                      {isProcessing
                        ? "Processing..."
                        : subscriptionInfo?.usedTrial &&
                            tier.tierType === "free"
                          ? "Trial Used"
                          : isRenewing
                            ? tier.tierType === "free"
                              ? "Switch to Free"
                              : "Renew Plan"
                            : tier.ctaText ||
                              (tier.isFree ? "Start Free Trial" : "Subscribe")}
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
