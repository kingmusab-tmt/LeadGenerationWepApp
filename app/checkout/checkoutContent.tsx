"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Grid,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { useInitializeUser } from "@/lib/hooks";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface Tier {
  _id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  tierType: string;
  discountPercentage: number;
  discountedPrice: string;
  annualPrice?: string;
  billingInterval?: "month" | "year";
  discountDuration?: "once" | "forever" | "repeating";
}

const StripeCheckoutButton = ({
  tier,
  billingInterval,
  onSuccess,
  onError,
  onCancel,
}: {
  tier: Tier;
  billingInterval: "month" | "year";
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const csrfFetch = useCSRFFetch();
  const idempotencyKeyRef = useRef<string | null>(null);

  const generateIdempotencyKey = (tierId: string, interval: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `subscription-${tierId}-${interval}-${timestamp}-${random}`;
  };

  const handleCheckout = async () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey(
        tier._id,
        billingInterval,
      );
    }

    setLoading(true);
    onError("");

    try {
      const response = await csrfFetch(
        "/api/payments/stripe/stripecheckoutapi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            tierId: tier._id,
            billingInterval: billingInterval,
            idempotencyKey: idempotencyKeyRef.current,
          }),
        },
      );
      const data = await response.json();

      if (data.success) {
        window.location.href = data.sessionUrl;
      } else {
        onError(data.message || "Failed to initiate Stripe payment");
        idempotencyKeyRef.current = null;
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
      idempotencyKeyRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [tier._id, billingInterval]);

  // Calculate display price based on billing interval
  const displayPrice =
    billingInterval === "year"
      ? parseFloat(tier.annualPrice || tier.price)
      : parseFloat(tier.discountedPrice || tier.price);

  return (
    <Button
      onClick={handleCheckout}
      variant="contained"
      color="primary"
      fullWidth
      disabled={loading}
      size="large"
      sx={{ height: 48 }}
    >
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        `Pay $${displayPrice.toFixed(2)}${billingInterval === "year" ? "/year" : "/month"}`
      )}
    </Button>
  );
};

const PaymentSection = ({
  tier,
  billingInterval,
  onSuccess,
  onError,
  onCancel,
}: {
  tier: Tier;
  billingInterval: "month" | "year";
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      const verifyPayment = async () => {
        try {
          const response = await axios.get(
            `/api/payments/status?sessionId=${sessionId}`,
          );
          if (response.data.success) {
            onSuccess();
            router.replace(window.location.pathname);
          } else {
            onError("Payment verification failed");
          }
        } catch (err) {
          onError("Error verifying payment");
        }
      };
      verifyPayment();
    } else if (paymentStatus === "canceled") {
      onCancel();
    }
  }, [onSuccess, onError, onCancel, router, searchParams]);

  return (
    <StripeCheckoutButton
      tier={tier}
      billingInterval={billingInterval}
      onSuccess={onSuccess}
      onError={onError}
      onCancel={onCancel}
    />
  );
};

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useInitializeUser();
  const { data: session, status, update: updateSession } = useSession();

  const [activeStep, setActiveStep] = useState(0);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [completed, setCompleted] = useState(false);
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push(
        `/auth/sign-in?callbackUrl=${encodeURIComponent(
          window.location.pathname,
        )}`,
      );
    }
  }, [currentUser, router]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setShowSuccessModal(true);
      setActiveStep(2);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "canceled") {
      setShowFailureModal(true);
      setIsCanceled(true);
      setActiveStep(1);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTier = async () => {
      const planId = searchParams.get("plan");
      if (!planId) {
        router.push("/plan");
        return;
      }

      try {
        const response = await axios.get(
          `/api/subscriptions/tiers?tierId=${planId}`,
        );
        // Extract the actual tier data from the response
        const tierData = response.data.data || response.data;
        if (!tierData.isActive) {
          throw new Error("This tier is not currently available");
        }
        setTier(tierData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tier");
        router.push("/plan");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchTier();
    }
  }, [status, router, searchParams]);

  const handlePaymentSuccess = () => {
    setActiveStep(2);
    setShowSuccessModal(true);
    setVerifying(false);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
    setVerifying(false);
  };

  const handlePaymentCancel = () => {
    setShowFailureModal(true);
    setIsCanceled(true);
    setActiveStep(1);
  };

  const handleCancelOrder = () => {
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = () => {
    setCancelModalOpen(false);
    router.push("/plan");
  };

  const handleBackToPayment = () => {
    setIsCanceled(false);
    setError(null);
    setShowFailureModal(false);
  };

  const handleRetryVerification = async () => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    setVerifying(true);
    setError(null);
    try {
      const response = await axios.get(
        `/api/payments/status?sessionId=${sessionId}`,
      );
      if (response.data.success) {
        handlePaymentSuccess();
      } else {
        setError("Payment verification failed");
      }
    } catch (err) {
      setError("Error verifying payment");
    } finally {
      setVerifying(false);
    }
  };

  const handleCloseSuccessModal = async () => {
    setShowSuccessModal(false);

    // Force session refresh to update JWT token with new subscription status
    console.log("[Checkout] Payment successful, refreshing session...");
    await updateSession();

    // Small delay to ensure session propagates
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (session) {
      console.log("[Checkout] Session refreshed, redirecting to dashboard");
      router.push(`/dashboard/${session?.user?.role}/overview`);
    } else if (currentUser) {
      router.push(`/dashboard/${currentUser.role}/overview`);
    }
  };

  const handleCloseFailureModal = () => {
    setShowFailureModal(false);
  };

  if (status !== "authenticated" || loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !tier) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Alert severity="error">{error || "Plan not found"}</Alert>
        <Button onClick={() => router.push("/plan")} sx={{ mt: 2 }}>
          Back to plan
        </Button>
      </Container>
    );
  }

  // Calculate total based on billing interval
  const totalAmount =
    billingInterval === "year"
      ? parseFloat(tier.annualPrice || (parseFloat(tier.price) * 12).toString())
      : parseFloat(tier.discountedPrice || tier.price);

  return (
    <>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
          <Step>
            <StepLabel>Select Plan</StepLabel>
          </Step>
          <Step>
            <StepLabel>Payment Method</StepLabel>
          </Step>
          <Step>
            <StepLabel>Complete</StepLabel>
          </Step>
        </Stepper>

        {!showSuccessModal && !showFailureModal && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                {activeStep === 0 ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Review Your Plan
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                    >
                      You've selected the <strong>{tier.name}</strong> plan.
                    </Typography>

                    <Box mb={3}>
                      {tier.discountPercentage > 0 && (
                        <Chip
                          label={`${tier.discountPercentage}% OFF`}
                          color="success"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="body1" paragraph>
                        {tier.description}
                      </Typography>
                    </Box>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="billing-interval-label">
                        Billing Cycle
                      </InputLabel>
                      <Select
                        labelId="billing-interval-label"
                        value={billingInterval}
                        label="Billing Cycle"
                        onChange={(e) =>
                          setBillingInterval(e.target.value as "month" | "year")
                        }
                      >
                        <MenuItem value="month">
                          Monthly - ${tier.discountedPrice || tier.price}/month
                        </MenuItem>
                        <MenuItem value="year">
                          Annual - $
                          {tier.annualPrice ||
                            (parseFloat(tier.price) * 12).toFixed(2)}
                          /year
                          {tier.annualPrice &&
                            parseFloat(tier.annualPrice) <
                              parseFloat(tier.price) * 12 && (
                              <Chip
                                label={`Save ${Math.round((1 - parseFloat(tier.annualPrice) / (parseFloat(tier.price) * 12)) * 100)}%`}
                                color="success"
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {/* <List dense>
                      {tier.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List> */}

                    <Box mt={4} display="flex" gap={2}>
                      <Button
                        variant="outlined"
                        onClick={handleCancelOrder}
                        fullWidth
                      >
                        Cancel Order
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => setActiveStep(1)}
                      >
                        Continue to Payment
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Complete Payment
                    </Typography>

                    {isCanceled ? (
                      <Box textAlign="center">
                        <Alert severity="warning" sx={{ mb: 3 }}>
                          Your payment was canceled
                        </Alert>
                        <Button
                          variant="contained"
                          onClick={handleBackToPayment}
                        >
                          Try Again
                        </Button>
                      </Box>
                    ) : (
                      <Box display="flex" flexDirection="column" gap={2}>
                        <PaymentSection
                          tier={tier}
                          billingInterval={billingInterval}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          onCancel={handlePaymentCancel}
                        />
                        <Button
                          variant="text"
                          onClick={() => setActiveStep(0)}
                          sx={{ mt: 2 }}
                        >
                          Back to Plan Selection
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Plan:</Typography>
                  <Typography fontWeight="bold">{tier.name}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Billing Cycle:</Typography>
                  <Typography fontWeight="bold">
                    {billingInterval === "year" ? "Annual" : "Monthly"}
                  </Typography>
                </Box>

                {tier.discountPercentage > 0 && (
                  <>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Base Price:</Typography>
                      <Typography sx={{ textDecoration: "line-through" }}>
                        $
                        {billingInterval === "year"
                          ? (parseFloat(tier.price) * 12).toFixed(2)
                          : tier.price}
                        /{billingInterval === "year" ? "year" : "month"}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Discount:</Typography>
                      <Typography color="success.main">
                        {tier.discountPercentage}% OFF
                        {tier.discountDuration === "once" &&
                          " (first payment only)"}
                      </Typography>
                    </Box>
                  </>
                )}

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>
                    {billingInterval === "year" ? "Annual" : "Monthly"} Price:
                  </Typography>
                  <Typography fontWeight="bold">
                    $
                    {billingInterval === "year"
                      ? tier.annualPrice ||
                        (parseFloat(tier.price) * 12).toFixed(2)
                      : tier.discountedPrice || tier.price}
                    /{billingInterval === "year" ? "year" : "month"}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle1">Total Today:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {verifying && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Verifying payment... <CircularProgress size={20} sx={{ ml: 2 }} />
          </Alert>
        )}

        {error && !isCanceled && !verifying && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              searchParams.get("session_id") && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleRetryVerification}
                >
                  Retry
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}
      </Container>

      {/* Success Payment Dialog */}
      <Dialog
        open={showSuccessModal}
        onClose={handleCloseSuccessModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CheckCircleIcon color="success" sx={{ mr: 2 }} />
            Payment Successful!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Thank you for subscribing to the <strong>{tier.name}</strong> plan.
          </Typography>
          <Typography variant="body1" paragraph>
            Your subscription is now active. You can manage your account from
            the dashboard.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseSuccessModal}
          >
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failed Payment Dialog */}
      <Dialog
        open={showFailureModal}
        onClose={handleCloseFailureModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Payment Failed</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your payment was not completed successfully.
          </Typography>
          <Typography variant="body1" paragraph>
            Please try again or contact support if the problem persists.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseFailureModal}
          >
            Try Again
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        aria-labelledby="cancel-order-title"
      >
        <DialogTitle id="cancel-order-title">Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this order? You'll be returned to
            the plans page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModalOpen(false)}>Keep Order</Button>
          <Button onClick={confirmCancelOrder} color="error" autoFocus>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CheckoutContent;
