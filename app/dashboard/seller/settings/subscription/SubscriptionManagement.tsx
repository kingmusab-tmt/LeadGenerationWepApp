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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Upgrade as UpgradeIcon,
} from "@mui/icons-material";
import { useNotification } from "@/lib/useNotification";
import UsageLimitsCard from "./UsageLimitsCard";
import {
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASONS,
  CancellationReason,
} from "@/app/hooks/useSubscriptionCancel";

interface PaymentMethodInfo {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
}

interface TierDetails {
  name: string;
  description?: string;
  features?: string[];
}

interface SubscriptionUsage {
  leads?: number;
  callSeconds?: number;
  forms?: number;
  buyers?: number;
  emailCampaigns?: number;
  smsCampaigns?: number;
  invoices?: number;
}

interface SubscriptionLimits {
  leads?: number;
  callSeconds?: number;
  forms?: number;
  buyers?: number;
  emailCampaignsPerMonth?: number;
  smsCampaignsPerMonth?: number;
  invoicesPerMonth?: number;
  callRecording?: boolean;
  callTranscription?: boolean;
  callAIAnalysis?: boolean;
  chatbotEnabled?: boolean;
  leadScoringEnabled?: boolean;
  zapierIntegration?: boolean;
  apiAccess?: boolean;
  exports?: boolean;
  advancedReports?: boolean;
  liveSupport?: boolean;
  prioritySupport?: boolean;
}

interface SubscriptionDetails {
  subscriptionPlan?: string;
  subscriptionPrice?: number;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  isSubscriptionActive?: boolean;
  isTrial?: boolean;
  billingInterval?: "month" | "year";
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  paymentFailed?: boolean;
  subscriptionUsage?: SubscriptionUsage;
  subscriptionLimits?: SubscriptionLimits;
  stripeDetails?: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    currentPeriodStart?: string;
    cancelAtPeriodEnd: boolean;
    cancelAt: string | null;
  } | null;
  renewalAmount?: number | null;
  renewalCurrency?: string;
  defaultPaymentMethod?: PaymentMethodInfo | null;
  tierDetails?: TierDetails | null;
}

interface SubscriptionResponse {
  success: boolean;
  subscription: SubscriptionDetails;
  message?: string;
}

// Card brand display names
const cardBrandDisplay: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

interface SubscriptionManagementProps {
  onOpenChangePlanModal?: () => void;
}

export default function SubscriptionManagement({
  onOpenChangePlanModal,
}: SubscriptionManagementProps) {
  const notify = useNotification();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | "">("");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/subscriptions/manage");
      const data: SubscriptionResponse = await response.json();

      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setError(data.message || "Failed to load subscription details");
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setError("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          cancelImmediately,
          reason: cancelReason || undefined,
          feedbackText: cancelFeedback || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        notify(
          data.message || "Subscription cancellation processed",
          "success",
        );
        setCancelDialogOpen(false);
        setCancelReason("");
        setCancelFeedback("");
        fetchSubscription();
      } else {
        notify(data.message || "Failed to cancel subscription", "error");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      notify("Failed to cancel subscription", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });

      const data = await response.json();

      if (data.success) {
        notify("Subscription reactivated!", "success");
        fetchSubscription();
      } else {
        notify(data.message || "Failed to reactivate", "error");
      }
    } catch (err) {
      console.error("Reactivate error:", err);
      notify("Failed to reactivate subscription", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "billing-portal",
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.success && data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      } else {
        notify(data.message || "Failed to open billing portal", "error");
      }
    } catch (err) {
      console.error("Billing portal error:", err);
      notify("Failed to open billing portal", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount?: number | null, currency: string = "usd") => {
    if (amount == null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusColor = () => {
    if (subscription?.paymentFailed) return "error";
    if (subscription?.cancelAtPeriodEnd) return "warning";
    if (subscription?.isSubscriptionActive) return "success";
    if (subscription?.isTrial) return "info";
    return "default";
  };

  const getStatusLabel = () => {
    if (subscription?.paymentFailed) return "Payment Failed";
    if (subscription?.cancelAtPeriodEnd) return "Cancelling";
    if (subscription?.isSubscriptionActive) return "Active";
    if (subscription?.isTrial) return "Trial";
    return "Inactive";
  };

  const getPaymentMethodDisplay = () => {
    const pm = subscription?.defaultPaymentMethod;
    if (!pm) return null;

    const brand = pm.brand
      ? cardBrandDisplay[pm.brand] || pm.brand.toUpperCase()
      : "Card";
    const expiry =
      pm.expMonth && pm.expYear ? `${pm.expMonth}/${pm.expYear}` : "";

    return { brand, last4: pm.last4, expiry };
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchSubscription} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const paymentMethod = getPaymentMethodDisplay();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Subscription Management
      </Typography>

      {subscription?.paymentFailed && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Payment Failed</Typography>
          <Typography variant="body2">
            Your last payment failed. Please update your payment method to
            continue your subscription.
          </Typography>
        </Alert>
      )}

      {subscription?.cancelAtPeriodEnd && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Cancellation Scheduled</Typography>
          <Typography variant="body2">
            Your subscription will end on{" "}
            {formatDate(subscription.subscriptionExpiryDate)}. You can
            reactivate anytime before then.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Current Plan Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Current Plan</Typography>
                <Chip
                  label={getStatusLabel()}
                  color={getStatusColor()}
                  size="small"
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography color="textSecondary">Plan</Typography>
                  <Typography fontWeight="medium">
                    {subscription?.tierDetails?.name ||
                      subscription?.subscriptionPlan ||
                      "No plan"}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography color="textSecondary">Billing</Typography>
                  <Typography fontWeight="medium">
                    {subscription?.billingInterval === "year"
                      ? "Annual"
                      : "Monthly"}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography color="textSecondary">Started</Typography>
                  <Typography>
                    {formatDate(subscription?.subscriptionStartDate)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography color="textSecondary">
                    {subscription?.cancelAtPeriodEnd ? "Ends On" : "Renews On"}
                  </Typography>
                  <Typography>
                    {formatDate(subscription?.subscriptionExpiryDate)}
                  </Typography>
                </Box>

                {subscription?.isTrial && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography color="textSecondary">Trial Status</Typography>
                    <Chip label="Free Trial" color="info" size="small" />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Billing & Payment Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Billing & Payment
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {/* Renewal Amount */}
                <Box display="flex" alignItems="center" gap={1}>
                  <MoneyIcon color="action" />
                  <Box flex={1}>
                    <Typography color="textSecondary" variant="body2">
                      {subscription?.cancelAtPeriodEnd
                        ? "Final Amount"
                        : subscription?.isTrial
                          ? "Trial Status"
                          : "Renewal Amount"}
                    </Typography>
                    {subscription?.isTrial ? (
                      <Typography variant="h6">
                        Free
                        <Typography
                          component="span"
                          variant="body2"
                          color="textSecondary"
                        >
                          {" "}
                          (14-day trial)
                        </Typography>
                      </Typography>
                    ) : (
                      <Typography variant="h6">
                        {formatCurrency(
                          subscription?.renewalAmount ??
                            subscription?.subscriptionPrice,
                          subscription?.renewalCurrency,
                        )}
                        {subscription?.billingInterval && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="textSecondary"
                          >
                            {" "}
                            /{" "}
                            {subscription.billingInterval === "year"
                              ? "year"
                              : "month"}
                          </Typography>
                        )}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Next Billing Date */}
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon color="action" />
                  <Box flex={1}>
                    <Typography color="textSecondary" variant="body2">
                      {subscription?.cancelAtPeriodEnd
                        ? "Access Until"
                        : "Next Billing Date"}
                    </Typography>
                    <Typography>
                      {formatDate(subscription?.subscriptionExpiryDate)}
                    </Typography>
                  </Box>
                </Box>

                {/* Payment Method */}
                <Box display="flex" alignItems="center" gap={1}>
                  <CreditCardIcon color="action" />
                  <Box flex={1}>
                    <Typography color="textSecondary" variant="body2">
                      Payment Method
                    </Typography>
                    {paymentMethod ? (
                      <Typography>
                        {paymentMethod.brand} •••• {paymentMethod.last4}
                        {paymentMethod.expiry && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="textSecondary"
                          >
                            {" "}
                            (exp {paymentMethod.expiry})
                          </Typography>
                        )}
                      </Typography>
                    ) : subscription?.isTrial ? (
                      <Typography color="textSecondary">
                        Add during upgrade
                      </Typography>
                    ) : subscription?.isSubscriptionActive ? (
                      <Typography color="textSecondary">
                        {paymentMethod
                          ? "Payment method on file"
                          : "Click 'Manage Payment Methods' to view/update"}
                      </Typography>
                    ) : (
                      <Typography color="textSecondary">
                        No payment method on file
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CreditCardIcon />}
                  endIcon={<OpenInNewIcon />}
                  onClick={handleOpenBillingPortal}
                  disabled={
                    actionLoading ||
                    (!subscription?.isSubscriptionActive &&
                      !subscription?.isTrial)
                  }
                  sx={{ mt: 1 }}
                >
                  {subscription?.isTrial
                    ? "Set Up Payment"
                    : "Manage Payment Methods"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage & Limits Card */}
        <Grid size={{ xs: 12 }}>
          <UsageLimitsCard
            usage={subscription?.subscriptionUsage}
            limits={subscription?.subscriptionLimits}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Actions Section */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Manage Subscription
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          variant="outlined"
          startIcon={<UpgradeIcon />}
          onClick={onOpenChangePlanModal}
        >
          Change Plan
        </Button>

        {subscription?.cancelAtPeriodEnd ? (
          <Button
            variant="contained"
            color="success"
            startIcon={<RefreshIcon />}
            onClick={handleReactivate}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={20} />
            ) : (
              "Reactivate Subscription"
            )}
          </Button>
        ) : (
          subscription?.isSubscriptionActive && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialogOpen(true)}
              disabled={actionLoading}
            >
              Cancel Subscription
            </Button>
          )
        )}
      </Stack>

      {/* Enhanced Cancel Dialog with Feedback */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Cancel Subscription
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            We&apos;re sorry to see you go. Please let us know why you&apos;re
            canceling so we can improve.
          </Typography>

          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Reason for canceling</InputLabel>
            <Select
              value={cancelReason}
              label="Reason for canceling"
              onChange={(e) =>
                setCancelReason(e.target.value as CancellationReason)
              }
            >
              {CANCELLATION_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {CANCELLATION_REASON_LABELS[reason]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional feedback (optional)"
            value={cancelFeedback}
            onChange={(e) => setCancelFeedback(e.target.value)}
            placeholder="Tell us more about your experience..."
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            When should we cancel?
          </Typography>
          <Stack spacing={1}>
            <Button
              variant={!cancelImmediately ? "contained" : "outlined"}
              onClick={() => setCancelImmediately(false)}
              fullWidth
              sx={{ justifyContent: "flex-start", textAlign: "left" }}
            >
              <Box>
                <Typography>Cancel at end of billing period</Typography>
                <Typography variant="caption" color="textSecondary">
                  Keep access until{" "}
                  {formatDate(subscription?.subscriptionExpiryDate)}
                </Typography>
              </Box>
            </Button>
            <Button
              variant={cancelImmediately ? "contained" : "outlined"}
              color="error"
              onClick={() => setCancelImmediately(true)}
              fullWidth
              sx={{ justifyContent: "flex-start", textAlign: "left" }}
            >
              <Box>
                <Typography>Cancel immediately</Typography>
                <Typography variant="caption">
                  Lose access now (no refunds)
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : "Confirm Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
