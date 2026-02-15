"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
} from "@mui/material";
import {
  Check as CheckIcon,
  ArrowUpward as UpgradeIcon,
  ArrowDownward as DowngradeIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useNotification } from "@/lib/useNotification";

interface Tier {
  _id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlight: boolean;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  annualPrice?: string;
  stripeMonthlyPriceId?: string;
  stripeAnnualPriceId?: string;
}

interface CurrentSubscription {
  subscriptionPlan?: string;
  subscriptionTierId?: string;
  billingInterval?: "month" | "year";
  isSubscriptionActive?: boolean;
  isTrial?: boolean;
}

interface ProrationPreview {
  currentPlanName: string;
  newPlanName: string;
  currentPlanPrice: number;
  newPlanPrice: number;
  prorationAmount: number;
  immediateCharge: number;
  nextBillingDate: string;
  isUpgrade: boolean;
  currency: string;
}

export default function PlanChangeComponent() {
  const notify = useNotification();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<ProrationPreview | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tiers and current subscription
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tiersRes, subscriptionRes] = await Promise.all([
        fetch("/api/tiers"),
        fetch("/api/subscriptions/manage"),
      ]);

      const tiersData = await tiersRes.json();
      const subscriptionData = await subscriptionRes.json();

      if (Array.isArray(tiersData)) {
        // Filter to show only seller tiers with Stripe pricing configured
        const sellerTiers = tiersData.filter(
          (t: Tier) =>
            t.tierUserType === "seller" &&
            (t.stripeMonthlyPriceId || t.stripeAnnualPriceId),
        );
        setTiers(sellerTiers);
      }

      if (subscriptionData.success) {
        setCurrentSubscription(subscriptionData.subscription);
        if (subscriptionData.subscription?.billingInterval) {
          setBillingInterval(subscriptionData.subscription.billingInterval);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch proration preview when a tier is selected
  const fetchPreview = useCallback(
    async (tier: Tier) => {
      try {
        setPreviewLoading(true);
        setPreview(null);

        const response = await fetch("/api/subscriptions/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview-plan",
            newTierId: tier._id,
            billingInterval,
            isTrialConversion: currentSubscription?.isTrial || false,
          }),
        });

        const data = await response.json();

        if (data.success && data.preview) {
          setPreview(data.preview);
        } else {
          notify(data.message || "Failed to preview plan change", "error");
        }
      } catch (err) {
        console.error("Failed to fetch preview:", err);
        notify("Failed to preview plan change", "error");
      } finally {
        setPreviewLoading(false);
      }
    },
    [billingInterval, currentSubscription?.isTrial, notify],
  );

  // Refetch preview when billing interval changes and a tier is selected
  useEffect(() => {
    if (selectedTier && !previewLoading) {
      fetchPreview(selectedTier);
    }
  }, [billingInterval, selectedTier, fetchPreview, previewLoading]);

  const handleSelectTier = (tier: Tier) => {
    if (tier._id === currentSubscription?.subscriptionTierId) {
      // Same tier, just interval change
      if (billingInterval === currentSubscription?.billingInterval) {
        return; // No change
      }
    }
    setSelectedTier(tier);
    fetchPreview(tier);
    setConfirmDialogOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedTier) return;

    try {
      setChangingPlan(true);

      const response = await fetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-plan",
          newTierId: selectedTier._id,
          billingInterval,
          prorationBehavior: "create_prorations",
        }),
      });

      const data = await response.json();

      if (data.success) {
        notify(
          `Successfully ${preview?.isUpgrade ? "upgraded" : "changed"} to ${selectedTier.name}!`,
          "success",
        );
        setConfirmDialogOpen(false);
        setSelectedTier(null);
        setPreview(null);
        fetchData(); // Refresh subscription data
      } else {
        notify(data.message || "Failed to change plan", "error");
      }
    } catch (err) {
      console.error("Failed to change plan:", err);
      notify("Failed to change plan", "error");
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCloseDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedTier(null);
    setPreview(null);
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getPrice = (tier: Tier) => {
    if (billingInterval === "year" && tier.annualPrice) {
      return parseFloat(tier.annualPrice);
    }
    return parseFloat(tier.price);
  };

  const isCurrentPlan = (tier: Tier) => {
    return tier._id === currentSubscription?.subscriptionTierId;
  };

  const getPlanAction = (tier: Tier) => {
    if (
      isCurrentPlan(tier) &&
      billingInterval === currentSubscription?.billingInterval
    ) {
      return { label: "Current Plan", disabled: true, isUpgrade: null };
    }

    const currentPrice = tiers.find(
      (t) => t._id === currentSubscription?.subscriptionTierId,
    );
    if (!currentPrice) {
      return { label: "Select Plan", disabled: false, isUpgrade: true };
    }

    const currentPriceNum = getPrice(currentPrice);
    const newPriceNum = getPrice(tier);

    if (newPriceNum > currentPriceNum) {
      return { label: "Upgrade", disabled: false, isUpgrade: true };
    } else if (newPriceNum < currentPriceNum) {
      return { label: "Downgrade", disabled: false, isUpgrade: false };
    } else {
      return { label: "Switch Plan", disabled: false, isUpgrade: null };
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={400} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchData} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (
    !currentSubscription?.isSubscriptionActive &&
    !currentSubscription?.isTrial
  ) {
    return (
      <Alert severity="info">
        You don&apos;t have an active subscription. Please subscribe to a plan
        first.
      </Alert>
    );
  }

  return (
    <Box id="plan-change-section">
      <Typography variant="h5" gutterBottom>
        Change Your Plan
      </Typography>

      {currentSubscription?.isTrial && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">14-Day Free Trial</Typography>
          <Typography variant="body2">
            Your trial period is active. Select a paid plan below to convert
            your trial to a paid subscription. You won&apos;t be charged until
            your trial ends.
          </Typography>
        </Alert>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Upgrade or downgrade your subscription anytime. Changes take effect
        immediately with prorated billing.
      </Typography>

      {/* Billing Interval Toggle */}
      <Box display="flex" justifyContent="center" sx={{ mb: 4 }}>
        <ToggleButtonGroup
          value={billingInterval}
          exclusive
          onChange={(_, value) => value && setBillingInterval(value)}
          aria-label="billing interval"
        >
          <ToggleButton value="month">Monthly</ToggleButton>
          <ToggleButton value="year">
            Annual
            <Chip
              label="Save 20%"
              size="small"
              color="success"
              sx={{ ml: 1 }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Current Plan Indicator */}
      {currentSubscription?.subscriptionPlan && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Current Plan: <strong>{currentSubscription.subscriptionPlan}</strong>
          {currentSubscription.billingInterval && (
            <>
              {" "}
              (
              {currentSubscription.billingInterval === "year"
                ? "Annual"
                : "Monthly"}
              )
            </>
          )}
        </Alert>
      )}

      {/* Plan Cards */}
      <Grid container spacing={3}>
        {tiers.map((tier) => {
          const planAction = getPlanAction(tier);
          const isCurrent = isCurrentPlan(tier);

          return (
            <Grid size={{ xs: 12, md: 4 }} key={tier._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  border: isCurrent ? "2px solid" : "1px solid",
                  borderColor: isCurrent ? "primary.main" : "divider",
                  ...(tier.highlight &&
                    !isCurrent && {
                      border: "2px solid",
                      borderColor: "secondary.main",
                    }),
                }}
              >
                {tier.highlight && (
                  <Chip
                    icon={<StarIcon />}
                    label="Most Popular"
                    color="secondary"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}

                {isCurrent && (
                  <Chip
                    label="Current Plan"
                    color="primary"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}

                <CardContent
                  sx={{ flexGrow: 1, pt: tier.highlight || isCurrent ? 4 : 2 }}
                >
                  <Typography variant="h6" gutterBottom>
                    {tier.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 2 }}
                  >
                    {tier.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" component="span">
                      {formatCurrency(getPrice(tier))}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      color="textSecondary"
                    >
                      /{billingInterval === "year" ? "year" : "month"}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1}>
                    {tier.features.slice(0, 6).map((feature, index) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <CheckIcon color="success" fontSize="small" />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                    {tier.features.length > 6 && (
                      <Typography variant="body2" color="textSecondary">
                        +{tier.features.length - 6} more features
                      </Typography>
                    )}
                  </Stack>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant={planAction.isUpgrade ? "contained" : "outlined"}
                    color={
                      planAction.isUpgrade === false ? "warning" : "primary"
                    }
                    fullWidth
                    disabled={planAction.disabled}
                    onClick={() => handleSelectTier(tier)}
                    startIcon={
                      planAction.isUpgrade === true ? (
                        <UpgradeIcon />
                      ) : planAction.isUpgrade === false ? (
                        <DowngradeIcon />
                      ) : null
                    }
                  >
                    {planAction.label}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {preview?.isUpgrade ? (
              <UpgradeIcon color="success" />
            ) : (
              <DowngradeIcon color="warning" />
            )}
            Confirm Plan Change
          </Box>
        </DialogTitle>

        <DialogContent>
          {previewLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : preview ? (
            <Stack spacing={2}>
              <Alert severity={preview.isUpgrade ? "success" : "warning"}>
                {preview.isUpgrade
                  ? "You're upgrading your plan!"
                  : "You're downgrading your plan. Some features may become unavailable."}
              </Alert>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography color="textSecondary">Current Plan</Typography>
                <Typography>{preview.currentPlanName}</Typography>
              </Box>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography color="textSecondary">New Plan</Typography>
                <Typography fontWeight="bold">{preview.newPlanName}</Typography>
              </Box>

              <Divider />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography color="textSecondary">
                  {billingInterval === "year" ? "Annual" : "Monthly"} Price
                </Typography>
                <Typography>
                  {formatCurrency(preview.newPlanPrice, preview.currency)}/
                  {billingInterval}
                </Typography>
              </Box>

              {preview.prorationAmount !== 0 && (
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography color="textSecondary">
                    Proration{" "}
                    {preview.prorationAmount > 0 ? "Credit" : "Adjustment"}
                  </Typography>
                  <Typography
                    color={
                      preview.prorationAmount < 0 ? "success.main" : "inherit"
                    }
                  >
                    {formatCurrency(
                      Math.abs(preview.prorationAmount),
                      preview.currency,
                    )}
                  </Typography>
                </Box>
              )}

              <Divider />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography fontWeight="bold">Due Today</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(preview.immediateCharge, preview.currency)}
                </Typography>
              </Box>

              <Typography variant="body2" color="textSecondary">
                Your next billing date will be{" "}
                {new Date(preview.nextBillingDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Stack>
          ) : (
            <Alert severity="error">
              Unable to preview plan change. Please try again.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={changingPlan}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmChange}
            variant="contained"
            color={preview?.isUpgrade ? "primary" : "warning"}
            disabled={changingPlan || previewLoading || !preview}
          >
            {changingPlan ? (
              <CircularProgress size={20} />
            ) : (
              `Confirm ${preview?.isUpgrade ? "Upgrade" : "Change"}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
