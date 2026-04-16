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
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Check as CheckIcon,
  ArrowUpward as UpgradeIcon,
  ArrowDownward as DowngradeIcon,
  Star as StarIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useNotification } from "@/app/hooks";
import { useCSRFFetch } from "@/app/hooks";

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

type TiersApiResponse = {
  success?: boolean;
  data?: {
    tiers?: Tier[];
  };
};

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

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePlanModal({
  open,
  onClose,
  onSuccess,
}: ChangePlanModalProps) {
  const notify = useNotification();
  const csrfFetch = useCSRFFetch();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<ProrationPreview | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<
    "month" | "year"
  >("month");

  // Fetch tiers and current subscription
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tiersRes, subscriptionRes] = await Promise.all([
        fetch("/api/tiers"),
        fetch("/api/subscriptions/manage"),
      ]);

      const tiersPayload: TiersApiResponse | Tier[] = await tiersRes.json();
      const subscriptionData = await subscriptionRes.json();

      const tiersData = Array.isArray(tiersPayload)
        ? tiersPayload
        : Array.isArray(tiersPayload.data?.tiers)
          ? tiersPayload.data.tiers
          : [];

      // Filter to show only seller tiers with Stripe pricing configured
      const sellerTiers = tiersData.filter(
        (t: Tier) =>
          t.tierUserType === "seller" &&
          (t.stripeMonthlyPriceId || t.stripeAnnualPriceId),
      );
      setTiers(sellerTiers);

      if (subscriptionData.success) {
        setCurrentSubscription(subscriptionData.subscription);
        // Initialize selected billing interval from current subscription
        setSelectedBillingInterval(
          subscriptionData.subscription?.billingInterval || "month",
        );
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Fetch proration preview when a tier is selected
  const fetchPreview = useCallback(
    async (tier: Tier) => {
      try {
        setPreviewLoading(true);
        setPreview(null);

        console.log("[ChangePlanModal] Fetching preview for:", {
          tierId: tier._id,
          tierName: tier.name,
          billingInterval: selectedBillingInterval,
          isTrial: currentSubscription?.isTrial,
        });

        const response = await csrfFetch("/api/subscriptions/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview-plan",
            newTierId: tier._id,
            billingInterval: selectedBillingInterval,
            isTrialConversion: currentSubscription?.isTrial || false,
          }),
        });

        const data = await response.json();
        console.log("[ChangePlanModal] Preview response:", data);

        if (data.success && data.preview) {
          setPreview(data.preview);
        } else {
          console.error("[ChangePlanModal] Preview failed:", data.message);
          notify(data.message || "Failed to preview plan change", "error");
        }
      } catch (err) {
        console.error("[ChangePlanModal] Failed to fetch preview:", err);
        notify("Failed to preview plan change", "error");
      } finally {
        setPreviewLoading(false);
      }
    },
    [currentSubscription?.isTrial, selectedBillingInterval, notify, csrfFetch],
  );

  const handleSelectTier = (tier: Tier) => {
    if (tier._id === currentSubscription?.subscriptionTierId) {
      return; // Can't select the same tier
    }
    setSelectedTier(tier);
    fetchPreview(tier);
    setConfirmDialogOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedTier) return;

    try {
      setChangingPlan(true);

      const response = await csrfFetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-plan",
          newTierId: selectedTier._id,
          billingInterval: selectedBillingInterval,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Updated message to reflect payment processing
        let successMessage = `Plan change to ${selectedTier.name} initiated!`;

        if (preview?.immediateCharge && preview.immediateCharge > 0) {
          successMessage += ` Payment of ${formatCurrency(preview.immediateCharge, preview.currency)} is being processed. Your plan will upgrade once payment is confirmed.`;
        } else {
          successMessage += ` Your plan will update at your next billing date.`;
        }

        notify(successMessage, "success");
        setConfirmDialogOpen(false);
        setSelectedTier(null);
        setPreview(null);
        onClose();
        onSuccess?.();

        // Refresh page after a short delay to allow webhook to process
        // This ensures user sees updated subscription limits and features
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 2000);
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

  const handleCloseConfirmDialog = () => {
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
    if (selectedBillingInterval === "year" && tier.annualPrice) {
      return parseFloat(tier.annualPrice);
    }
    return parseFloat(tier.price);
  };

  const isCurrentPlan = (tier: Tier) => {
    // For trial users, no tier is the "current" plan
    if (currentSubscription?.isTrial) {
      return false;
    }
    return tier._id === currentSubscription?.subscriptionTierId;
  };

  const getPlanAction = (tier: Tier) => {
    // For trial users, show all tiers as selection options
    if (currentSubscription?.isTrial) {
      return { label: "Select Plan", disabled: false, isUpgrade: true };
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
      return { label: "Current Plan", disabled: true, isUpgrade: null };
    }
  };

  const billingText = selectedBillingInterval === "year" ? "Annual" : "Monthly";
  const availableTiers = tiers.filter((tier) => !isCurrentPlan(tier));

  if (error && open) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Change Your Plan</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {error}
            <Button onClick={fetchData} size="small" sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (
    !currentSubscription?.isSubscriptionActive &&
    !currentSubscription?.isTrial
  ) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Change Your Plan</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            You don&apos;t have an active subscription. Please subscribe to a
            plan first.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h6">Change Your Plan</Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mt: 0.5 }}
              >
                Upgrade or downgrade your subscription anytime. Changes take
                effect immediately with prorated billing.
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={onClose}
              disabled={changingPlan || confirmDialogOpen}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Billing Interval Toggle */}
          <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
            <ToggleButtonGroup
              value={selectedBillingInterval}
              exclusive
              onChange={(_, newInterval) => {
                if (newInterval !== null) {
                  setSelectedBillingInterval(newInterval);
                }
              }}
              aria-label="billing interval"
              size="small"
            >
              <ToggleButton value="month" aria-label="monthly">
                <Box sx={{ px: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Monthly
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Pay monthly
                  </Typography>
                </Box>
              </ToggleButton>
              <ToggleButton value="year" aria-label="yearly">
                <Box sx={{ px: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Yearly
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Save up to 20%
                  </Typography>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {currentSubscription?.isTrial && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle2">14-Day Free Trial</Typography>
              <Typography variant="body2">
                Your trial period is active. Select a paid plan below to convert
                your trial to a paid subscription. You won&apos;t be charged
                until your trial ends.
              </Typography>
            </Alert>
          )}

          {/* Current Plan Indicator - Hide for trial users */}
          {currentSubscription?.subscriptionPlan &&
            !currentSubscription?.isTrial && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Current Plan:{" "}
                <strong>{currentSubscription.subscriptionPlan}</strong>
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

          {loading ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map((i) => (
                <Grid size={{ xs: 12, md: 4 }} key={i}>
                  <Skeleton variant="rectangular" height={400} />
                </Grid>
              ))}
            </Grid>
          ) : availableTiers.length === 0 ? (
            <Alert severity="info">
              You are already on the highest plan available.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {availableTiers.map((tier) => {
                const planAction = getPlanAction(tier);

                return (
                  <Grid size={{ xs: 12, md: 4 }} key={tier._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        border: "1px solid",
                        borderColor: "divider",
                        ...(tier.highlight && {
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

                      <CardContent
                        sx={{ flexGrow: 1, pt: tier.highlight ? 4 : 2 }}
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
                            /{billingText.toLowerCase()}
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
                          variant={
                            planAction.isUpgrade ? "contained" : "outlined"
                          }
                          color={
                            planAction.isUpgrade === false
                              ? "warning"
                              : "primary"
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
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={onClose}
            disabled={changingPlan || confirmDialogOpen}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
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
                  {billingText} Price
                </Typography>
                <Typography>
                  {formatCurrency(preview.newPlanPrice, preview.currency)}/
                  {billingText.toLowerCase()}
                </Typography>
              </Box>

              {preview.prorationAmount !== 0 && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography color="textSecondary">
                      Prorated charge for remaining period
                    </Typography>
                    <Typography>
                      {formatCurrency(
                        Math.abs(preview.prorationAmount),
                        preview.currency,
                      )}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ mt: -1 }}
                  >
                    Calculated based on time remaining until{" "}
                    {new Date(preview.nextBillingDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </Typography>
                </>
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

              {preview.immediateCharge > 0 && (
                <Alert severity="info" icon={false}>
                  <Typography variant="body2">
                    This amount will be <strong>automatically charged</strong>{" "}
                    to your card on file when you confirm. This represents the
                    prorated cost for {preview.newPlanName} from now until your
                    next billing date (
                    {new Date(preview.nextBillingDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      },
                    )}
                    ), minus any credit from your current plan.
                  </Typography>
                </Alert>
              )}

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
          <Button onClick={handleCloseConfirmDialog} disabled={changingPlan}>
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
    </>
  );
}
